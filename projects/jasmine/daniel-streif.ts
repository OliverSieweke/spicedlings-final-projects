import { ServiceType } from "../../lib/stacks/spicedling/spicedling-services";

export const configs = {
	firstName: "Daniel",
	lastName: "Streif",
	cohort: "Jasmine",
	subDomain: "climbers-paradise",
	repository: {
		gitHubOwner: "danielstreif",
		repoName: "final-project",
		branch: "main",
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
			// @ts-ignore
			environment: new Map([
				["MAX_AGE", 7 * 24 * 60 * 60 * 1000],
				["SOCKET_URL", "http://climbers-paradise.oliversieweke.com"],
			]),
			secretEnvironmentVariables: new Set(["MAPBOX_KEY"]),
			randomSecretEnvironmentVariables: new Set(["SESSION_SECRET"]),
		},
		{
			type: ServiceType.POSTGRES,
			name: "Postgres",
			configs: {
				dbSetupScriptPath: "./setup.sql",
			},
		},
	],
};
