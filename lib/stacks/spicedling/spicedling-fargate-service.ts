// AWS =============================================================================================
import { Construct, Duration, Stack, StackProps } from "@aws-cdk/core";
import { SecurityGroup } from "@aws-cdk/aws-ec2";
import {
	Cluster,
	ContainerDefinition,
	ContainerImage,
	FargateService,
	FargateTaskDefinition,
	LogDriver,
	PropagatedTagSource,
} from "@aws-cdk/aws-ecs";
import { RetentionDays } from "@aws-cdk/aws-logs";

// Project =========================================================================================
import {
	ascii,
	spicedlingMainResourcePascalCaseName,
	spicedlingResourceKebabCaseName,
} from "../../utils/names";
import { Core } from "../core/core";
import { BaseService } from "../../services/base-service";
import { DOCKER_IMAGES_LATEST_TAG } from "../../../settings";

// ============================================================================================== \\
// ============================= Spicedling Fargate Service  Stack ============================== \\
// ============================================================================================== \\
/**
 * @summary Creates the Fargate service for running the Spicedling containers
 *
 * The Fargate service to be deployed individually for every Spicedling's project.
 *
 * This stack sets up the container definitions for the required services and links them to a task
 * definition that is set for the Fargate service that runs the Spicedlings project. In addition
 * permissions are set to allow the core load balancer to forward requests to the correct targets.
 *
 * Dependencies:
 * - {@link Core}
 * - {@link SpicedlingServices}
 *
 * @example ```
 * npx cdk deploy SpicedlingFinalProjectFargateServiceJasmineDanielStreif
 * ```
 */
export class SpicedlingFargateService extends Stack {
	readonly fargateService: FargateService;

	constructor(
		scope: Construct,
		id: string,
		{ spicedlingConfigs, core, privateSubnet, ...stackProps }: SpicedlingFargateServiceProps,
	) {
		super(scope, id, stackProps);

		const { firstName, lastName, cohort, subDomain } = spicedlingConfigs;
		const { vpc } = core;

		// I) Create Task Definition ---------------------------------------------------------------
		const taskDefinition = new FargateTaskDefinition(this, "TaskDefinition");

		// II) Create Security Group ---------------------------------------------------------------
		// The security group is needed for allowing the load balancer to forward requests to the
		// container target
		const fargateServiceSecurityGroup = new SecurityGroup(this, "SecurityGroup", {
			vpc,
			securityGroupName: this.stackName,
			description: ascii(`Fargate Service - ${cohort} - ${firstName} ${lastName}`),
		});

		// III) Create Fargate Service -------------------------------------------------------------
		this.fargateService = new FargateService(this, "FargateService", {
			serviceName: spicedlingMainResourcePascalCaseName(spicedlingConfigs),
			cluster: new Cluster(this, "Cluster", {
				clusterName: spicedlingMainResourcePascalCaseName(spicedlingConfigs),
				vpc,
			}),
			taskDefinition,
			assignPublicIp: !privateSubnet,
			circuitBreaker: { rollback: true },
			enableECSManagedTags: true,
			desiredCount: 1,
			minHealthyPercent: 100,
			maxHealthyPercent: 200,
			healthCheckGracePeriod: Duration.seconds(10),
			propagateTags: PropagatedTagSource.SERVICE,
			securityGroups: [fargateServiceSecurityGroup],
		});

		// III) Configure Service Containers -------------------------------------------------------
		for (let service of BaseService.services) {
			const { name, repository, environment, secrets } = service;

			// A) Configure Permissions
			repository.grantPull(taskDefinition.taskRole);

			// B) Configure Container
			const container = new ContainerDefinition(this, service.containerName, {
				image: ContainerImage.fromEcrRepository(repository, DOCKER_IMAGES_LATEST_TAG),
				taskDefinition,
				logging: LogDriver.awsLogs({
					streamPrefix: spicedlingResourceKebabCaseName(name, spicedlingConfigs),
					logRetention: RetentionDays.THREE_MONTHS,
				}),
				environment,
				secrets,
			});

			service.addAsTarget(this, {
				core,
				fargateService: this.fargateService,
				container,
				fargateServiceSecurityGroup,
				subDomain,
			});
		}
	}
}

interface SpicedlingFargateServiceProps extends StackProps {
	readonly spicedlingConfigs: {
		readonly cohort: string;
		readonly firstName: string;
		readonly lastName: string;
		readonly subDomain: string;
	};
	/**
	 * Core stack.
	 */
	readonly core: Core;
	/**
	 * Specifies whether the project containers will run in a private subnet equipped with a NAT
	 * gateway - this can be quite costly (~100€/month).
	 *
	 * @default - false
	 */
	readonly privateSubnet?: boolean;
}

// ============================================================================================== \\
// ============================================================================================== \\
