import { ServiceType } from "../../lib/stacks/spicedling/spicedling-services";

export const configs = {
	firstName: "Magali",
	lastName: "Gonçalves da Silva",
	cohort: "Jasmine",
	subDomain: "purangaw",
	repository: {
		gitHubOwner: "OliverSieweke",
		repoName: "purangaw",
		branch: "master",
		invitedGitHubUsername: "OliverSieweke",
	},
	services: [
		{
			type: ServiceType.NODE_SERVER,
			name: "Node Server",
			configs: {
				databaseUrlEnvironmentVariable: "DATABASE_URL",
				portEnvironmentVariable: "PORT",
				buildStep: true,
			},
		},
		{
			type: ServiceType.POSTGRES,
			name: "Postgres",
			configs: {
				dbSetupScriptPath: "./sql/init.sql",
			},
		},
	],
};
