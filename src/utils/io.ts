import {PluginContext} from "molstar/lib/mol-plugin/context";
import {PluginConfig} from "molstar/lib/mol-plugin/config";
import {DownloadDensity} from "molstar/lib/mol-plugin-state/actions/volume";

export function loadEmdb(plugin: PluginContext, id: string) {
    const provider = plugin.config.get(PluginConfig.Download.DefaultEmdbProvider)!;
    console.log(provider, id);
    return plugin.runTask(plugin.state.data.applyAction(DownloadDensity, {
        source: {
            name: 'pdb-emd-ds' as const,
            params: {
                provider: {
                    id,
                    server: provider,
                },
                detail: 3,
            }
        }
    }));
}