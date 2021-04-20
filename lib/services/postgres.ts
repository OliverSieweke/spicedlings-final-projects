// AWS =============================================================================================
import { BaseService, ServiceConfigs } from "./base-service";
import { SpicedlingServices } from "../stacks/spicedling/spicedling-services";

// Project =========================================================================================
import { POSTGRES_PASSWORD } from "../../secrets";
import { DOCKER_IMAGES_LATEST_TAG } from "../../settings";
import { SpicedlingIdentity } from "../interfaces/spicedling-configs";

// ============================================================================================== \\
// ======================================== Postgres DB ========================================= \\
// ============================================================================================== \\
/**
 * @summary Postgres Service
 *
 * Inherits most functionality from {@link BaseService}. The main addition being:
 * - The specification of a SQL setup Script.
 * - The specification of a postgres password for the Docker build step.
 */
export class Postgres extends BaseService {
	readonly #dbSetupScriptPath: string;

	constructor(
		stack: SpicedlingServices,
		postgresServiceConfigs: PostgresServiceConfigs,
		spicedlingIdentity: SpicedlingIdentity,
	) {
		super(stack, postgresServiceConfigs, spicedlingIdentity);

		// Provide Setup Script Path ---------------------------------------------------------------
		this.#dbSetupScriptPath = postgresServiceConfigs.configs.dbSetupScriptPath ?? "./setup.sql";

		// Add Postgres Password Environment Variable ----------------------------------------------
		this.addEnvironmentVariable("POSTGRES_PASSWORD", POSTGRES_PASSWORD);
	}

	get dockerFileTemplate(): string {
		return "postgres";
	}

	// [18.04.21 | os] TODO: Rewrite to make generic and read --build-args from property.
	/**
	 * The base build command is overwritten to provide the `RELATIVE_DB_SETUP_SCRIPT_PATH` argument.
	 */
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
			`docker build -f ${this.dockerFileName} -t ${
				this.repository.repositoryUri
			}:${DOCKER_IMAGES_LATEST_TAG} --build-arg RELATIVE_DB_SETUP_SCRIPT_PATH=${
				this.#dbSetupScriptPath
			} .`,
		];
	}
}

interface PostgresServiceConfigs extends ServiceConfigs {
	readonly configs: {
		/**
		 * DB setup script path
		 *
		 * @default - "./setup.sql"
		 */
		readonly dbSetupScriptPath?: string;
	};
}

// ============================================================================================== \\
// ============================================================================================== \\
