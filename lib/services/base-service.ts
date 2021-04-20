// AWS =============================================================================================
import { Annotations, Duration, RemovalPolicy, Stack } from "@aws-cdk/core";
import { SecurityGroup } from "@aws-cdk/aws-ec2";
import { Repository, TagStatus } from "@aws-cdk/aws-ecr";
import { ContainerDefinition, FargateService, Secret as EcsSecret } from "@aws-cdk/aws-ecs";
import { Secret } from "@aws-cdk/aws-secretsmanager";

// Core ============================================================================================
import { readFileSync, writeFileSync } from "fs";

// Third Party =====================================================================================
import camelCase from "lodash.camelcase";
import kebabCase from "lodash.kebabcase";

// Project =========================================================================================
import { DOCKER_IMAGES_LATEST_TAG, DOCKERIZER_REPO } from "../../settings";
import { spicedlingResourceKebabCaseName, upperCaseSnakeCase } from "../utils/names";
import { targetGroupsPriorities as targetGroupsPrioritiesPath } from "../utils/paths";
import { SpicedlingIdentity } from "../interfaces/spicedling-configs";
import { SpicedlingServices, ServiceType } from "../stacks/spicedling/spicedling-services";
import { Core } from "../stacks/core/core";

// ============================================================================================== \\
// ======================================== Base Service ======================================== \\
// ============================================================================================== \\
/**
 * @summary Abstract BaseService class
 *
 * This class contains the main logic for building and deploying spicedling containers and is to be
 * extended to create specific services.
 */
export abstract class BaseService {
	readonly name: string;
	/**
	 * {@link SpicedlingServices} stack as part of which further resources will be created.
	 */
	readonly #stack: SpicedlingServices;
	readonly #spicedlingIdentity: SpicedlingIdentity;
	readonly #environment: Map<string, string> = new Map();
	readonly #secrets: Map<string, EcsSecret> = new Map();
	readonly repository: Repository;
	/**
	 * URL of the spicedlings-final-projects-dockerizer library.
	 * Could be made into an npm package eventually.
	 */
	protected static readonly dockerizerRepo: string = DOCKERIZER_REPO;
	/**
	 * Registry ofa all created services
	 */
	static readonly services: Set<BaseService> = new Set();

	protected constructor(
		stack: SpicedlingServices,
		serviceConfigs: ServiceConfigs,
		spicedlingIdentity: SpicedlingIdentity,
	) {
		const {
			name,
			environment = new Map(),
			secretEnvironmentVariables = new Set(),
			randomSecretEnvironmentVariables = new Set(),
		} = serviceConfigs;

		this.name = name;
		this.#stack = stack;
		this.#spicedlingIdentity = spicedlingIdentity;
		this.#environment = new Map(
			[...environment.entries()].map(([key, value]) => [key, value.toString()]),
		);

		// I) Create ECR Repositories --------------------------------------------------------------
		this.repository = this.createEcrRepository();

		// II) Create Secrets ----------------------------------------------------------------------
		// [18.04.21 | os] TODO: Limit Secrets to a JSON secret with fields (cost reduction)
		for (const secretVariable of randomSecretEnvironmentVariables) {
			this.addSecretEnvironmentVariable(secretVariable);
		}
		for (const secretVariable of secretEnvironmentVariables) {
			this.addSecretEnvironmentVariable(secretVariable);
		}

		secretEnvironmentVariables.size &&
			Annotations.of(stack).addWarning(
				`Make sure to add appropriate values in the secrets manager for the secrets of the service "${name}": ${Array.from(
					secretEnvironmentVariables,
				).join(",")}.`,
			);

		// III) Register Service -------------------------------------------------------------------
		BaseService.services.add(this);
	}

	// ===================================== Repositories ======================================  \\

	/**
	 *
	 */
	createEcrRepository(): Repository {
		return new Repository(this.#stack, camelCase(this.name), {
			repositoryName: spicedlingResourceKebabCaseName(this.name, this.#spicedlingIdentity),
			lifecycleRules: [
				{
					description: "Remove Past Images after 30 days",
					rulePriority: 1,
					tagStatus: TagStatus.UNTAGGED,
					maxImageAge: Duration.days(30),
				},
			],
			removalPolicy: RemovalPolicy.DESTROY,
		});
	}
	static get repositoryArns(): string[] {
		return Array.from(this.services).map((service) => service.repository.repositoryArn);
	}

	// ============================ Environment Variables & Secrets ============================  \\
	/**
	 * Creates secret environment variables.
	 */
	addSecretEnvironmentVariable(key: string): void {
		this.#secrets.set(
			key,
			EcsSecret.fromSecretsManager(
				new Secret(this.#stack, camelCase(`${this.#stack.stackName}${key}`), {
					secretName: upperCaseSnakeCase(`${this.#stack.stackName}_${key}`),
					removalPolicy: RemovalPolicy.DESTROY,
					description: `Environment Variable for the service "${
						this.name
					}" of the stack "${this.#stack.stackName}".`,
				}),
			),
		);
	}
	get secrets(): { [key: string]: EcsSecret } {
		return Object.fromEntries(this.#secrets);
	}
	addEnvironmentVariable(key: string, value: string | number | boolean) {
		this.#environment.set(key, value.toString());
	}
	get environment(): { [key: string]: string } {
		return Object.fromEntries(this.#environment);
	}

	// ======================================== Docker =========================================  \\
	protected abstract get dockerFileTemplate(): string;
	get dockerFileName(): string {
		return `${this.dockerFileTemplate}.Dockerfile`;
	}
	get containerName(): string {
		return kebabCase(this.name);
	}

	static get preBuildCommands(): string[] {
		return [
			"echo Logging in to Amazon ECR...",
			"aws --version",
			"$(aws ecr get-login --no-include-email --region $AWS_DEFAULT_REGION)",
		];
	}

	get buildCommands(): string[] {
		return [
			`echo Dockerizing service \\"${this.name}\\"...`,
			`echo Step 1: Creating Dockerfile for the Service \\"${this.name}\\" from template \\"${this.dockerFileTemplate}\\"...`,
			`npx --version`,
			`npx ${(this.constructor as typeof BaseService).dockerizerRepo} ${
				this.dockerFileTemplate
			}`,
			`echo Step2: Building Docker Image for the service \\"${this.name}\\"...`,
			`docker --version`,
			`docker build -f ${this.dockerFileName} -t ${this.repository.repositoryUri}:${DOCKER_IMAGES_LATEST_TAG} .`,
		];
	}
	static get buildCommands(): string[] {
		return Array.from(this.services)
			.map((service) => service.buildCommands)
			.flat();
	}

	get postBuildCommands(): string[] {
		return [
			`echo Pushing the Docker image for the service \\"${this.name}\\...`,
			"docker --version",
			`docker push ${this.repository.repositoryUri}:${DOCKER_IMAGES_LATEST_TAG}`,
		];
	}
	static get postBuildCommands(): string[] {
		return [
			...Array.from(this.services)
				.map((service) => service.postBuildCommands)
				.flat(),
			"echo Writing image definitions file...",
			this.imageDefinitionsFileCommand,
		];
	}
	static get imageDefinitionsFileCommand(): string {
		const images = Array.from(this.services).map(
			(service) =>
				`{"name":"${service.containerName}", "imageUri":"${service.repository.repositoryUri}:${DOCKER_IMAGES_LATEST_TAG}"}`,
		);
		return `echo '[${images.join(",")}]' > imagedefinitions.json`;
	}

	// ================================ Traffic Configurations =================================  \\

	addAsTarget(stack: Stack, addAsTargetProps: AddAsTargetProps): void {}

	// addPortMappings(container: ContainerDefinition) {}

	/**
	 * Load Balancer priority values must be unique.
	 * The uniqueness is currently ensured by keeping track of used values in a JSON file.
	 * This should eventually be rewritten to use a more central and persistent option.
	 */
	getAvailableTargetGroupsPriority(): number {
		const targetGroupsPriorities: { [key: string]: number } = JSON.parse(
			readFileSync(targetGroupsPrioritiesPath, "utf8"),
		);

		targetGroupsPriorities[this.#stack.stackName] ??=
			Math.max(0, ...Object.values(targetGroupsPriorities)) + 1;

		writeFileSync(targetGroupsPrioritiesPath, JSON.stringify(targetGroupsPriorities));

		return targetGroupsPriorities[this.#stack.stackName];
	}
}

export interface ServiceConfigs {
	type: ServiceType;
	name: string;
	configs?: { [key: string]: string | boolean | undefined };
	environment?: Map<string, string | number | boolean>;
	randomSecretEnvironmentVariables?: Set<string>;
	secretEnvironmentVariables?: Set<string>;
}

export interface AddAsTargetProps {
	core: Core;
	fargateService: FargateService;
	container: ContainerDefinition;
	fargateServiceSecurityGroup: SecurityGroup;
	subDomain: string;
}

// ============================================================================================== \\
// ============================================================================================== \\
