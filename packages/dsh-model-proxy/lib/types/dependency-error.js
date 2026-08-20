const AWIKI_PLUGIN_REQUIREMENT = '@awiki/dsh-plugin@^0.3.0';
export const AWIKI_PLUGIN_INSTALL_HINT = `@awiki/dsh-model-proxy requires ${AWIKI_PLUGIN_REQUIREMENT} in the same DSH profile. Install or upgrade it first with: dsh plugin --profile <profile> add ${AWIKI_PLUGIN_REQUIREMENT}`;
export function rethrowAwikiPluginDependencyError(error) {
    if (error instanceof Error
        && 'code' in error
        && (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED')
        && error.message.includes('@awiki/dsh-plugin')) {
        throw new Error(AWIKI_PLUGIN_INSTALL_HINT, { cause: error });
    }
    throw error;
}
//# sourceMappingURL=dependency-error.js.map