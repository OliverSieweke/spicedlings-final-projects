#!/usr/bin/env node
// Source Map ======================================================================================
import "source-map-support/register";

// Core ============================================================================================
import path from "path";

// AWS =============================================================================================
import * as cdk from "@aws-cdk/core";
import { SpicedlingPipeline } from "../lib/stacks/spicedling/spicedling-pipeline";
import { SpicedlingFargateService } from "../lib/stacks/spicedling/spicedling-fargate-service";
import { Core } from "../lib/stacks/core/core";
import { SpicedlingServices } from "../lib/stacks/spicedling/spicedling-services";

// Project =========================================================================================
import { APPLICATION_GROUP_TAG, CORE_STACK_NAME, PRIVATE_SUBNET } from "../settings";
import {
	spicedlingFargateServiceStackName,
	spicedlingPipelineStackName,
	spicedlingServicesStackName,
	spicedlingStackTags,
} from "../lib/utils/names";
import { projects } from "../lib/utils/paths";

// ============================================================================================== \\
// ============================================ App ============================================= \\
// ============================================================================================== \\
const app = new cdk.App();

(async () => {
	const { configs: spicedlingConfigs } = await import(
		path.resolve(projects, app.node.tryGetContext("configsPath"))
	);

	// ========================================================================================== \\
	// ======================================= Core Stack ======================================= \\
	// ========================================================================================== \\
	/**
	 * The core stack is to be deployed once initially with: npm run deploy:core
	 *
	 * The "CORE_LOAD_BALANCER_SECURITY_GROUP_ID" setting variable needs to be specified after the
	 * creation of the core stack.
	 */
	const core = new Core(app, CORE_STACK_NAME, {
		privateSubnet: PRIVATE_SUBNET,
		tags: {
			ApplicationGroup: APPLICATION_GROUP_TAG,
			ApplicationRole: "Core",
		},
	});

	// ========================================================================================== \\
	// =================================== Spicedling Stacks ==================================== \\
	// ========================================================================================== \\
	/**
	 * The spicedling stacks are to be deployed individually for every spicedling with.
	 *
	// ---------------------------------------- Services ---------------------------------------- \\
	/**
	 * The SpicedlingServices stack does not need to be deployed on its own as it will be created as
	 * a dependency of the SpicedlingPipeline or SpicedlingFargateService stacks.
	 */
	new SpicedlingServices(app, spicedlingServicesStackName(spicedlingConfigs), {
		spicedlingConfigs,
		tags: spicedlingStackTags("Services", spicedlingConfigs),
	});

	// ------------------------------------ Fargate Service ------------------------------------- \\
	/**
	 * The SpicedlingFargateService stack is to be deployed after the first deployment of the
	 * SpicedlingPipeline stack with: npm run deploy:spicedling
	 */
	const { fargateService } = new SpicedlingFargateService(
		app,
		spicedlingFargateServiceStackName(spicedlingConfigs),
		{
			spicedlingConfigs,
			core,
			privateSubnet: PRIVATE_SUBNET,
			tags: spicedlingStackTags("Fargate Service", spicedlingConfigs),
		},
	);

	// ---------------------------------------- Pipeline ---------------------------------------- \\
	/**
	 * The SpicedlingPipeline is to be deployed in two steps (Step I before and Step II after the
	 * deployment of the SpicedlingFargateService stack) with: npm run deploy:spicedling
	 */
	new SpicedlingPipeline(app, spicedlingPipelineStackName(spicedlingConfigs), {
		spicedlingConfigs,
		fargateService,
		tags: spicedlingStackTags("Pipeline", spicedlingConfigs),
	});

	// ========================================================================================== \\
	// ========================================================================================== \\
})();
