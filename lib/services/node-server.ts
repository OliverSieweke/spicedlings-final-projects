// AWS =============================================================================================
import { Stack } from "@aws-cdk/core";
import { Port, SecurityGroup } from "@aws-cdk/aws-ec2";
import { Protocol } from "@aws-cdk/aws-ecs";
import {
	ApplicationListener,
	ApplicationProtocol,
	ApplicationTargetGroup,
	ListenerCondition,
} from "@aws-cdk/aws-elasticloadbalancingv2";

// Project =========================================================================================
import { CORE_LOAD_BALANCER_SECURITY_GROUP_ID } from "../../settings";
import { POSTGRES_PASSWORD } from "../../secrets";
import { SpicedlingServices } from "../stacks/spicedling/spicedling-services";
import { AddAsTargetProps, BaseService, ServiceConfigs } from "./base-service";

// ============================================================================================== \\
// ======================================== Node Server ========================================= \\
// ============================================================================================== \\

/**
 * @summary Node Server Service
 *
 * The node server service comes with two main specificities:
 * - it automatically sets the environment variables required for the database connection if applicable.
 * - it establishes all the rules and permissions to allow the core HTTP listener to forward
 * requests to the container.
 */
export class NodeServer extends BaseService {
	/**
	 * Node server port
	 *
	 * The current setup supports a single exposed node server per spicedling project.
	 * The port is therefore set as a static property.
	 */
	private static port: 8080 = 8080;

	/**
	 * Specifies whether a docker template with an npm build step is needed
	 * @default - false
	 */
	private readonly buildStep: boolean;

	constructor(
		stack: SpicedlingServices,
		nodeServerServiceConfigs: NodeServerServiceConfigs,
		spicedlingConfigs: {
			cohort: string;
			firstName: string;
			lastName: string;
		},
	) {
		super(stack, nodeServerServiceConfigs, spicedlingConfigs);

		// Specify Build Step ----------------------------------------------------------------------
		const { buildStep = false } = nodeServerServiceConfigs.configs;
		this.buildStep = buildStep;

		// Add Port Environment Variable -----------------------------------------------------------
		this.addEnvironmentVariable(
			nodeServerServiceConfigs.configs.portEnvironmentVariable,
			(this.constructor as typeof NodeServer).port,
		);

		// Add Database Url Environment Variable if Applicable -------------------------------------
		if (nodeServerServiceConfigs.configs.databaseUrlEnvironmentVariable) {
			this.addEnvironmentVariable(
				nodeServerServiceConfigs.configs.databaseUrlEnvironmentVariable,
				`postgres://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres?rejectUnauthorized=false`,
			);
		}
	}

	/**
	 * Two docker file templates are available in `spicedlings-final-projects-dockerizer`, one with
	 * build step, one without
	 */
	get dockerFileTemplate(): "node-server" | "node-server-no-build" {
		return this.buildStep ? "node-server" : "node-server-no-build";
	}

	/**
	 * Adds node server container as a target group
	 *
	 * Sets all the necessary port mappings and security group rules.
	 * The core resources need to be imported manually through ids and ARNs to prevent cross
	 * dependencies between spicedlings' stacks.
	 */
	addAsTarget(
		stack: Stack,
		{
			core,
			fargateService,
			container,
			fargateServiceSecurityGroup,
			subDomain,
		}: AddAsTargetProps,
	) {
		const { vpc } = core;

		// I) Retrieve Resources from the Core Stack -----------------------------------------------
		/**
		 * The Security Group and HTTP Listener are retrieved through ids and ARNs and not directly
		 * from the Core stack, as this leads to cross dependencies between spicedling stacks.
		 * This somewhat imperfect solution is the result of a lot of fiddling around, don't change
		 * unless you have a brilliant idea.
		 */
		// A) Load Balancer Security Group .........................................................
		const loadBalancerSecurityGroup = SecurityGroup.fromSecurityGroupId(
			stack,
			"LoadBalancerSecurityGroup",
			CORE_LOAD_BALANCER_SECURITY_GROUP_ID,
			{ allowAllOutbound: false },
		);

		// B) HTTP Listener ........................................................................
		const httpListener = ApplicationListener.fromApplicationListenerAttributes(
			stack,
			`HttpListener`,
			{
				listenerArn: core.httpListener.listenerArn,
				securityGroup: loadBalancerSecurityGroup,
			},
		);

		// II) Enable Connection -------------------------------------------------------------------
		// A) Add Traffic Rules ....................................................................
		fargateServiceSecurityGroup.addIngressRule(
			loadBalancerSecurityGroup,
			Port.tcp((this.constructor as typeof NodeServer).port),
			`Load balancer to target: ${subDomain}`,
		);
		// B) Add Port Mapping .....................................................................
		container.addPortMappings({
			containerPort: (this.constructor as typeof NodeServer).port,
			hostPort: (this.constructor as typeof NodeServer).port,
		});

		// C) Add Target Group .....................................................................
		httpListener.addTargetGroups("TargetGroup", {
			conditions: [ListenerCondition.hostHeaders([`${subDomain}.oliversieweke.com`])],
			targetGroups: [
				new ApplicationTargetGroup(stack, "TargetGroup", {
					targetGroupName: subDomain,
					protocol: ApplicationProtocol.HTTP,
					vpc,
					targets: [
						fargateService.loadBalancerTarget({
							containerName: container.containerName,
							containerPort: container.findPortMapping(
								container.containerPort,
								Protocol.TCP,
							)!.hostPort,
						}),
					],
					healthCheck: {
						enabled: true,
						healthyHttpCodes: "200-399",
						healthyThresholdCount: 2,
					},
				}),
			],
			priority: this.getAvailableTargetGroupsPriority(),
		});
	}
}

interface NodeServerServiceConfigs extends ServiceConfigs {
	readonly configs: {
		/**
		 * Environment variable name from which the node server will read the port to listen on.
		 */
		readonly portEnvironmentVariable: string;
		/**
		 * Environment variable name from which the node server will read the Database URL, if
		 * applicable.
		 */
		readonly databaseUrlEnvironmentVariable?: string;
		/**
		 * Specifies whether an npm build step is required
		 *
		 * @default - false
		 */
		readonly buildStep?: boolean;
	};
}

// ============================================================================================== \\
// ============================================================================================== \\
