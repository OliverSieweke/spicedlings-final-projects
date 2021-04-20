// AWS =============================================================================================
import { Annotations, Construct, Duration, SecretValue, Stack, StackProps } from "@aws-cdk/core";
import { BuildSpec, PipelineProject } from "@aws-cdk/aws-codebuild";
import { Artifact, Pipeline } from "@aws-cdk/aws-codepipeline";
import {
	CodeBuildAction,
	EcsDeployAction,
	GitHubSourceAction,
	GitHubTrigger,
} from "@aws-cdk/aws-codepipeline-actions";
import { FargateService } from "@aws-cdk/aws-ecs";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "@aws-cdk/aws-iam";

// Project =========================================================================================
import { SECRETS_MANAGER_GITHUB_TOKENS_SECRET_NAME } from "../../../settings";
import {
	spicedlingMainResourcePascalCaseName,
	spicedlingResourceKebabCaseName,
	spicedlingResourcePascalCaseNameWithoutSeparator,
} from "../../utils/names";
import { BaseService } from "../../services/base-service";

// ============================================================================================== \\
// ================================= Spicedling Pipeline Stack ================================== \\
// ============================================================================================== \\
/**
 * @summary Creates the deployment pipeline for a Spicedling project
 *
 * The pipeline to be deployed individually for every Spicedling's project. It contains 3 stages
 * that may be deployed in two steps:
 *
 * I) When doing a standard deploy
 *     - Source: polls and sources the provided GitHub repository using the token from the
 *     invited user.
 *     - Build: dockerizes the project based on the service settings using the
 *     `spicedlings-final-project-dockerizer` library and pushes the images to `ECR`.
 *
 * II) When deploying with -c fargateDeployStage=true flag
 *     - Deploy: triggers a `Fargate` deployment.
 *
 * The second step should be done after deploying the associated `SpicedlingFargateService` stack.
 * Splitting the stages up that way allows to keep the `SpicedlingPipeline` and the
 * `SpicedlingFargateService` stacks separate while avoiding circular dependencies.
 *
 * **NB**: Make sure a GitHub token for the invited user is provided in the secrets manager
 * (the name of the secret is to be set under the SECRETS_MANAGER_GITHUB_TOKENS_SECRET_NAME
 * setting)
 *
 * Dependencies:
 * - {@link SpicedlingServices}
 * - {@link SpicedlingFargateService} (for step II) )
 *
 * @example
 * I)
 * npx cdk deploy SpicedlingFinalProjectPipelineJasmineDanielStreif
 * npx cdk deploy SpicedlingFinalProjectFargateServiceJasmineDanielStreif
 * II)
 * npx cdk deploy SpicedlingFinalProjectPipelineJasmineDanielStreif -c fargateDeployStage=true
 */
export class SpicedlingPipeline extends Stack {
	constructor(
		scope: Construct,
		id: string,
		{ spicedlingConfigs, fargateService, ...stackProps }: SpicedlingPipelineProps,
	) {
		super(scope, id, stackProps);

		const {
			firstName,
			lastName,
			cohort,
			repository: {
				gitHubOwner: owner,
				repoName: repo,
				branch = "master",
				invitedGitHubUsername = "OliverSieweke",
			},
		} = spicedlingConfigs;

		// I) Define the artifacts used in the pipeline --------------------------------------------
		const gitHubSourceArtifact = new Artifact("GitHubSource");
		const dockerImageArtifact = new Artifact("DockerizedApplication");

		// II) Set up permissions for the build role to upload the docker images to ECR ------------
		const buildRole = new Role(this, "BuildRole", {
			roleName: spicedlingResourcePascalCaseNameWithoutSeparator(
				"BuildRole",
				spicedlingConfigs,
			),
			assumedBy: new ServicePrincipal("codebuild.amazonaws.com"),
		});
		buildRole.addToPolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: [
					"ecr:BatchCheckLayerAvailability",
					"ecr:InitiateLayerUpload",
					"ecr:CompleteLayerUpload",
					"ecr:UploadLayerPart",
					"ecr:PutImage",
				],
				resources: BaseService.repositoryArns,
			}),
		);
		buildRole.addToPolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ecr:GetAuthorizationToken"],
				resources: ["*"],
			}),
		);

		// III) Create Pipeline --------------------------------------------------------------------
		const pipeline = new Pipeline(this, "Pipeline", {
			pipelineName: spicedlingMainResourcePascalCaseName(spicedlingConfigs),
			restartExecutionOnUpdate: true,
			stages: [
				// A) GitHub Source ................................................................
				{
					stageName: "Source",
					actions: [
						new GitHubSourceAction({
							actionName: "GitHubSource",
							owner,
							repo,
							branch,
							oauthToken: SecretValue.secretsManager(
								SECRETS_MANAGER_GITHUB_TOKENS_SECRET_NAME,
								{ jsonField: invitedGitHubUsername },
							),
							trigger: GitHubTrigger.POLL, // Poll used as Webhook access is only available to the repo owner
							output: gitHubSourceArtifact,
						}),
					],
				},
				// B) Docker Build .................................................................
				{
					stageName: "Build",
					actions: [
						new CodeBuildAction({
							actionName: "DockerBuild",
							input: gitHubSourceArtifact,
							outputs: [dockerImageArtifact],
							project: new PipelineProject(this, "DockerBuild", {
								projectName: this.stackName,
								description: `Dockerize and Upload Application | ${cohort} - ${firstName} ${lastName}`,
								environment: { privileged: true }, // Required for Docker
								role: buildRole, // Grants push access to ECR
								buildSpec: BuildSpec.fromObject({
									version: "0.2",
									phases: {
										pre_build: { commands: BaseService.preBuildCommands },
										build: { commands: BaseService.buildCommands },
										post_build: { commands: BaseService.postBuildCommands },
									},
									artifacts: {
										files: "**/*",
										name: spicedlingResourceKebabCaseName(
											"artifact",
											spicedlingConfigs,
										),
									},
								}),
							}),
						}),
					],
				},
			],
		});

		if (this.node.tryGetContext("fargateDeployStage")) {
			// C) Fargate Deploy ...................................................................
			/**
			 * To add the "Deploy" stage, the Pipeline stack needs to be deployed a second time with
			 * the `-c fargateDeployStage=true` flag (after deploying the SpicedlingFargateService
			 * stack).
			 *
			 * This somewhat imperfect solution is the result of a lot of fiddling around, don't
			 * change unless you have a brilliant idea.
			 *
			 *   - Having this resource live anywhere else causes circular dependencies.
			 *   - Having this resource as part of the initial Pipeline stack causes the Pipeline
			 *   deploy to fail and roll back when the SpicedlingFargateService fails to start
			 *   the containers.
			 */
			pipeline.addStage({
				stageName: "Deploy",
				actions: [
					new EcsDeployAction({
						actionName: "FargateDeploy",
						input: dockerImageArtifact,
						deploymentTimeout: Duration.minutes(30),
						service: fargateService,
					}),
				],
			});
		}

		// Annotations -----------------------------------------------------------------------------
		Annotations.of(this).addWarning(
			`Make sure a GitHub token for the invited user "${invitedGitHubUsername}" is provided in the secrets manager for the secret "${SECRETS_MANAGER_GITHUB_TOKENS_SECRET_NAME}".`,
		);
	}
}

interface SpicedlingPipelineProps extends StackProps {
	readonly spicedlingConfigs: {
		readonly cohort: string;
		readonly firstName: string;
		readonly lastName: string;
		readonly repository: {
			readonly gitHubOwner: string;
			readonly repoName: string;
			/**
			 * Branch to be deployed
			 *
			 * @default - master
			 */
			readonly branch?: string;
			/**
			 * Invited user, whose token will be used for polling the Github repository. Not
			 * required id the repo is public.
			 *
			 * The token should be provided in the secrets manager (the name of the secret is to be
			 * set under the SECRETS_MANAGER_GITHUB_TOKENS_SECRET_NAME setting)
			 *
			 * @default - OliverSieweke
			 */
			readonly invitedGitHubUsername?: string;
		};
	};
	/**
	 * `Fargate Service` resource from the {@link SpicedlingFargateService} stack.
	 */
	readonly fargateService: FargateService;
}

// ============================================================================================== \\
// ============================================================================================== \\
