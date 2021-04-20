// ============================================================================================== \\
// ========================================== Configs =========================================== \\
// ============================================================================================== \\
/**
 * Running the containers in a private subnet requires expensive NAT gateway!
 */
export const PRIVATE_SUBNET = false;
export const SECRETS_MANAGER_GITHUB_TOKENS_SECRET_NAME = "spicedlings-final-projects-github-tokens";
export const DOCKERIZER_REPO =
	"https://github.com/OliverSieweke/spicedlings-final-projects-dockerizer.git";
export const DOMAIN_NAME = "oliversieweke.com";
export const DOCKER_IMAGES_LATEST_TAG = "latest";

// ============================================================================================== \\
// ========================================= Resources ========================================== \\
// ============================================================================================== \\
export const CORE_LOAD_BALANCER_SECURITY_GROUP_ID = "sg-09e95cbdc436adad0";

// ============================================================================================== \\
// ======================================== Names & Tags ======================================== \\
// ============================================================================================== \\
export const CORE_STACK_NAME = "SpicedlingsFinalProjectsCore";
export const APPLICATION_GROUP_TAG = "Spicedlings Final Projects";
export const APPLICATION_TAG_PREFIX = "Spicedling Final Project";
export const SPICEDLING_STACKS_NAME_PREFIX = "SpicedlingFinalProject";

// ============================================================================================== \\
// =========================================== Other ============================================ \\
// ============================================================================================== \\
/**
 * @deprecated
 * May be of use when using the {@link SpicedlingsFinalProjectsCertificate} stack.
 */
export const CERTIFICATE_ARN =
	"arn:aws:acm:eu-central-1:619016996661:certificate/53faa487-3e11-4945-af70-15eb9b181126";
