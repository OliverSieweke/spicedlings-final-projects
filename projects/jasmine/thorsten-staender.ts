import { ServiceType } from "../../lib/stacks/spicedling/spicedling-services";

export const configs = {
	firstName: "Thorsten",
	lastName: "Staender",
	cohort: "Jasmine",
	subDomain: "aloha",
	repository: {
		gitHubOwner: "OliverSieweke",
		repoName: "jasmine-petition",
		branch: "Thorsten",
		invitedGitHubUsername: "OliverSieweke",
	},
	services: [
		{
			type: ServiceType.NODE_SERVER,
			name: "Node Server",
			configs: {
				databaseUrlEnvironmentVariable: "DATABASE_URL",
				portEnvironmentVariable: "PORT",
				buildStep: false,
			},
		},
		{
			type: ServiceType.POSTGRES,
			name: "Postgres",
			configs: {
				dbSetupScriptPath: "./init.sql",
			},
		},
	],
};
