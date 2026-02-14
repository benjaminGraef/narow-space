import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { MAX_NMB_OF_WORKSPACES } from './keyBinding.js';
import { WorkspaceNode } from './WorkspaceNode.js';

export class KeybindingConfigLoader {
    constructor(settings, workspaces) {
        this.settings = settings;
        this.workspaces = workspaces;
        this.configPath = GLib.build_filenamev([
            GLib.get_home_dir(),
            '.config',
            'narrow-space',
            'keybindings.json'
        ]);
    }

    log(msg) {
        console.log(`[narrow-space] ${msg}`);
    }

    loadWorkspaces(json) {
        let i = 1;
        for (const [key, workspaces] of Object.entries(json)) {
            try {
                if (!Array.isArray(workspaces)) {
                    this.console.log(`Skipping ${key}: value must be array`);
                    continue;
                }

                if (key === "define-workspace") {
                    for (const workspaceId of workspaces) {
                        this.workspaces.set(i, new WorkspaceNode(workspaceId));
                        i++;
                        if (i === MAX_NMB_OF_WORKSPACES) {
                            break;
                        }
                    }
                }

            } catch (e) {
                this.console.log(`Failed to define workspace ${key}: ${e}`);
            }
        }
    }

    load(loadWorkspaces) {
        const file = Gio.File.new_for_path(this.configPath);

        if (!file.query_exists(null)) {
            this.console.log(`Config file not found: ${this.configPath}`);
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            file.load_contents_async(null, (file, res) => {
                try {
                    const [ok, contents] = file.load_contents_finish(res);
                    if (!ok) {
                        this.console.log('Failed to read config file');
                        resolve();
                        return;
                    }

                    const text = new TextDecoder().decode(contents);
                    const json = JSON.parse(text);

                    if (loadWorkspaces) {
                        this.loadWorkspaces(json);
                    }
                    this.applyConfig(json);

                    resolve(json);
                } catch (e) {
                    console.error(e);
                    reject(e);
                }
            });
        });
    }

    applyConfig(json) {
        for (const [key, accels] of Object.entries(json)) {
            try {
                if (!Array.isArray(accels)) {
                    this.log(`Skipping ${key}: value must be array`);
                    continue;
                }

                if (!this.settings.settings_schema.has_key(key)) {
                    continue;
                }

                // check if the workspace was defined before
                const num = parseInt(key.match(/-(\d+)$/)?.[1]);
                if (Number.isFinite(num) && num < this.workspaces.size + 1) {
                    this.settings.set_strv(key, accels);
                    continue;
                }

                this.settings.set_strv(key, accels);
            } catch (e) {
                this.log(`Failed to apply key ${key}: ${e}`);
            }
        }
    }
}
