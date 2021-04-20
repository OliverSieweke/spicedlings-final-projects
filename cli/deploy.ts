// Source Map ======================================================================================
import "source-map-support/register";

import { projects as projectsPath } from "../lib/utils/paths.js";

import upperFirst from "lodash.upperfirst";

import inquirer from "inquirer";

import path from "path";

import { readdirSync } from "fs";
import { spicedlingFargateServiceStackName, spicedlingPipelineStackName } from "../lib/utils/names";

import { execFile } from "child_process";

// const execFile = promisify(execFileCallback);

const cohorts = readdirSync(projectsPath);

inquirer
	.prompt([
		{
			name: "cohort",
			type: "list",
			message: "Which cohort would you like to deploy?",
			choices: cohorts.map((cohort: string) => ({
				name: upperFirst(cohort),
				value: cohort,
			})),
		},
		{
			name: "spicedling",
			type: "list",
			message: "Which student would you like to deploy?",
			choices: async ({ cohort }: Answers) => {
				const projects = await Promise.all(
					readdirSync(path.resolve(projectsPath, cohort))
						.filter((fileName) => fileName.match(/(?<!\.d)\.ts$/))
						.map(async (fileName) => {
							return {
								fileName,
								configs: await import(
									path.resolve(projectsPath, cohort, fileName)
								).then(({ configs }) => configs),
							};
						}),
				);

				return projects.map(({ fileName, configs: { firstName, lastName } }) => ({
					name: `${firstName} ${lastName}`,
					value: {
						firstName,
						lastName,
						fileName,
					},
				}));
			},
		},
		{
			name: "deploy",
			type: "list",
			message: "Which stack would you like to deploy?",
			choices: ({ cohort, spicedling }: Answers) => {
				return [
					{
						name: "Pipeline [Step I]",
						value: {
							stack: spicedlingPipelineStackName({
								cohort: upperFirst(cohort),
								...spicedling,
							}),
						},
					},
					{
						name: "Fargate Service",
						value: {
							stack: spicedlingFargateServiceStackName({
								cohort: upperFirst(cohort),
								...spicedling,
							}),
						},
					},
					{
						name: "Pipeline [Step II]",
						value: {
							stack: spicedlingPipelineStackName({
								cohort: upperFirst(cohort),
								...spicedling,
							}),
							options: ["-c", "fargateDeployStage=true"],
						},
					},
				];
			},
		},
	])
	// @ts-ignore
	.then(({ cohort, spicedling: { fileName }, deploy: { stack, options = [] } }: Answers) => {
		const child = execFile("npx", [
			"cdk",
			"deploy",
			stack,
			...options,
			"-c",
			`configsPath=${path.join(cohort, fileName)}`,
		]);

		child.stdout.pipe(process.stdout);
		child.stderr.pipe(process.stderr);
	})
	.catch((error) => {
		console.log(error);
		if (error.isTtyError) {
			// Prompt couldn't be rendered in the current environment
		} else {
			// Something else went wrong
		}
	});

interface Answers {
	cohort: string;
	spicedling: {
		firstName: string;
		lastName: string;
		fileName: string;
	};
	deploy: {
		stack: string;
		otpions?: string[];
	};
}
