// Core ============================================================================================
import { readFileSync } from "fs";

// AWS =============================================================================================
import { Annotations, Construct, Stack, StackProps } from "@aws-cdk/core";
import { Vpc, SubnetType } from "@aws-cdk/aws-ec2";
import {
	ApplicationListener,
	ApplicationLoadBalancer,
	ApplicationProtocol,
	ListenerAction,
} from "@aws-cdk/aws-elasticloadbalancingv2";

// Project =========================================================================================
import { DOMAIN_NAME } from "../../../settings";
import { defaultPage } from "../../utils/paths";

// ============================================================================================== \\
// ========================================= Core Stack ========================================= \\
// ============================================================================================== \\
/**
 * @summary Creates the core stack for the final projects.
 *
 * This stack sets up the VPC in which the project containers will run, and adds the Load Balancer
 * and the HTTP Listener that will subsequently be configured to forward requests to the appropriate
 * containers.
 *
 * With the `PRIVATE_SUBNET` setting enabled, the project containers will run in a private subnet
 * equipped with a NAT gateway - this can be quite costly (~100€/month).
 *
 * This stack should only be deployed once initially through:
 *
 * @example
 * npx cdk deploy SpicedlingsFinalProjectsCore
 */
export class Core extends Stack {
	/**
	 * Core VPC in which the spicedlings project containers will run.
	 */
	readonly vpc: Vpc;
	/**
	 * HTTP Listener that will be configured to forward requests to appropriate spicedlings
	 * containers.
	 */
	readonly httpListener: ApplicationListener;

	constructor(
		scope: Construct,
		id: string,
		{ privateSubnet = false, ...stackProps }: CoreStackProps,
	) {
		super(scope, id, stackProps);

		// VPC  ------------------------------------------------------------------------------------
		this.vpc = new Vpc(this, `Vpc`, {
			maxAzs: 2,
			...(!privateSubnet
				? {
						subnetConfiguration: [
							{
								name: "public",
								subnetType: SubnetType.PUBLIC,
							},
						],
						natGateways: 0,
				  }
				: {}),
		});

		// Load Balancer  --------------------------------------------------------------------------
		const loadBalancerName = this.stackName;
		const loadBalancer = new ApplicationLoadBalancer(this, "LoadBalancer", {
			loadBalancerName,
			vpc: this.vpc,
			internetFacing: true,
		});

		// HTTP Listener ---------------------------------------------------------------------------
		this.httpListener = new ApplicationListener(this, "HttpListener", {
			protocol: ApplicationProtocol.HTTP,
			loadBalancer,
			defaultAction: ListenerAction.fixedResponse(404, {
				contentType: "text/html",
				messageBody: readFileSync(defaultPage, "utf8"),
			}),
		});

		// Annotations -----------------------------------------------------------------------------
		Annotations.of(this).addWarning(
			`Make sure to configure a CNAME record for "*.${DOMAIN_NAME}" pointing to the DNS name of the load balancer "${loadBalancerName}".`,
		);
		Annotations.of(this).addWarning(
			`Make sure to specify the "CORE_LOAD_BALANCER_SECURITY_GROUP_ID" setting variable after creation of the load balancer and its security group.`,
		);
	}
}

interface CoreStackProps extends StackProps {
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
