// Third Party =====================================================================================
import camelCase from "lodash.camelcase";
import kebabCase from "lodash.kebabcase";
import snakeCase from "lodash.snakecase";
import upperFirst from "lodash.upperfirst";

// Project =========================================================================================
import {
	APPLICATION_GROUP_TAG,
	APPLICATION_TAG_PREFIX,
	SPICEDLING_STACKS_NAME_PREFIX,
} from "../../settings";
import { SpicedlingIdentity } from "../interfaces/spicedling-configs";

// ============================================================================================== \\
// =========================================== Names ============================================ \\
// ============================================================================================== \\
/**
 * @module names
 * Module containing common name utilities for AWS resources.
 */

// ======================================= Main Resources ======================================= \\
// Camel -------------------------------------------------------------------------------------------
export const spicedlingMainResourceCamelCaseName = ({
	cohort,
	firstName,
	lastName,
}: SpicedlingIdentity): string =>
	camelCase(`${SPICEDLING_STACKS_NAME_PREFIX}${cohort}${firstName}${lastName}`);

// Pascal ------------------------------------------------------------------------------------------
export const spicedlingMainResourcePascalCaseName = (
	spicedlingIdentity: SpicedlingIdentity,
): string => upperFirst(spicedlingMainResourceCamelCaseName(spicedlingIdentity));

// Stack Names -------------------------------------------------------------------------------------
export const spicedlingStackName = (
	stackName: string,
	{ cohort, firstName, lastName }: SpicedlingIdentity,
): string =>
	upperFirst(
		camelCase(`${SPICEDLING_STACKS_NAME_PREFIX}${stackName}${cohort}${firstName}${lastName}`),
	);
export const spicedlingServicesStackName = (spicedlingIdentity: SpicedlingIdentity): string =>
	spicedlingStackName("Services", spicedlingIdentity);

export const spicedlingPipelineStackName = (spicedlingIdentity: SpicedlingIdentity): string =>
	spicedlingStackName("Pipeline", spicedlingIdentity);

export const spicedlingFargateServiceStackName = (spicedlingIdentity: SpicedlingIdentity): string =>
	spicedlingStackName("FargateService", spicedlingIdentity);

// Tags --------------------------------------------------------------------------------------------
export const spicedlingStackTags = (
	applicationRole: string,
	{ firstName, lastName, cohort }: SpicedlingIdentity,
) => ({
	ApplicationGroup: APPLICATION_GROUP_TAG,
	Application: `${APPLICATION_TAG_PREFIX} ${cohort} ${firstName} ${lastName}`,
	ApplicationRole: applicationRole,
	SpicedlingName: `${firstName} ${lastName}`,
	SpicedlingCohort: cohort,
});

// ========================================== Resources ========================================= \\
// Upper Case --------------------------------------------------------------------------------------
export const upperCaseSnakeCase = (string: string) => snakeCase(string).toUpperCase();

// Kebab -------------------------------------------------------------------------------------------
export const spicedlingResourceKebabCaseName = (
	resourceName: string,
	{ cohort, firstName, lastName }: SpicedlingIdentity,
): string =>
	`${kebabCase(`${SPICEDLING_STACKS_NAME_PREFIX}${cohort}${firstName}${lastName}`)}/${kebabCase(
		resourceName,
	)}`;

// Camel -------------------------------------------------------------------------------------------
export const spicedlingResourceCamelCaseName = (
	resourceName: string,
	{ cohort, firstName, lastName }: SpicedlingIdentity,
): string =>
	`${camelCase(`${SPICEDLING_STACKS_NAME_PREFIX}${cohort}${firstName}${lastName}`)}/${camelCase(
		resourceName,
	)}`;

export const spicedlingResourceCamelCaseNameWithoutSeparator = (
	resourceName: string,
	{ cohort, firstName, lastName }: SpicedlingIdentity,
): string =>
	camelCase(`${SPICEDLING_STACKS_NAME_PREFIX}${cohort}${firstName}${lastName}${resourceName}`);

// Pascal ------------------------------------------------------------------------------------------
export const spicedlingResourcePascalCaseNameWithoutSeparator = (
	resourceName: string,
	spicedlingIdentity: SpicedlingIdentity,
): string =>
	upperFirst(spicedlingResourceCamelCaseNameWithoutSeparator(resourceName, spicedlingIdentity));

export const spicedlingResourcePascalCaseName = (
	resourceName: string,
	spicedlingIdentity: SpicedlingIdentity,
): string => upperFirst(spicedlingResourceCamelCaseName(resourceName, spicedlingIdentity));

// ========================================== Other ========================================= \\
export const ascii = (string: string): string =>
	[...string].filter((char) => char.charCodeAt(0) < 127).join("");

// ============================================================================================== \\
// ============================================================================================== \\
