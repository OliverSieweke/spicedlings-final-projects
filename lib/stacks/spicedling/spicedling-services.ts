// AWS =============================================================================================
import { Construct, Stack, StackProps } from "@aws-cdk/core";

// Project =========================================================================================
import { BaseService, ServiceConfigs } from "../../services/base-service";
import { NodeServer } from "../../services/node-server";
import { Postgres } from "../../services/postgres";

// ============================================================================================== \\
// ================================= Spicedling Services Stack ================================== \\
// ============================================================================================== \\
export enum ServiceType {
	NODE_SERVER = "node-server",
	POSTGRES = "postgres",
}

type ServiceConstructor = typeof NodeServer | typeof Postgres;

/**
 * @summary Initializes the services required for a Spicedling project
 *
 * This stack is merely initializing the services and providing the context for them.
 * {@link BaseService} and its children are the classes providing the underlying logic.
 *
 * Dependee:
 * - {@link SpicedlingPipeline}
 * - {@link SpicedlingFargateService}
 *
 * @example ```
 * npx cdk deploy SpicedlingFinalProjectServicesJasmineDanielStreif
 * ```
 */
export class SpicedlingServices extends Stack {
	// [18.04.21 | os] TODO: make this a private static property in TS v4.3
	static SERVICE_TYPE_TO_SERVICE_CLASS: Map<ServiceType, ServiceConstructor> = new Map([
		[ServiceType.NODE_SERVER, NodeServer as ServiceConstructor],
		[ServiceType.POSTGRES, Postgres as ServiceConstructor],
	]);

	constructor(scope: Construct, id: string, { spicedlingConfigs, ...stackProps }: ServiceProps) {
		super(scope, id, stackProps);

		const { services } = spicedlingConfigs;

		for (const service of services) {
			const serviceConstructor = (this
				.constructor as typeof SpicedlingServices).SERVICE_TYPE_TO_SERVICE_CLASS.get(
				service.type,
			)!;
			// [18.04.21 | os] TODO: Establish strict typing for the service configs
			// @ts-ignore
			new serviceConstructor(this, service, spicedlingConfigs);
		}
	}
}

interface ServiceProps extends StackProps {
	readonly spicedlingConfigs: {
		readonly firstName: string;
		readonly lastName: string;
		readonly cohort: string;
		readonly services: ServiceConfigs[];
	};
}

// ============================================================================================== \\
// ============================================================================================== \\
