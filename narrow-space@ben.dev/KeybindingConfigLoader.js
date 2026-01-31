import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class KeybindingConfigLoader {
    constructor(settings) {
        this.settings = settings;
        this.configPath = GLib.build_filenamev([
            GLib.get_home_dir(),
            '.config',
            'narrow-space',
            'keybindings.json'
        ]);
    }

    log(msg) {
        console.log(`[SeaSpace] ${msg}`);
    }

    load() {
        try {
            const file = Gio.File.new_for_path(this.configPath);

            if (!file.query_exists(null)) {
                this.log(`Config file not found: ${this.configPath}`);
                return;
            }

            const [ok, contents] = file.load_contents(null);
            if (!ok) {
                this.log('Failed to read config file');
                return;
            }

            const text = new TextDecoder().decode(contents);
            const json = JSON.parse(text);

            this.applyConfig(json);

        } catch (e) {
            this.log(`Error loading config: ${e}`);
        }
    }

    applyConfig(json) {
        for (const [key, accels] of Object.entries(json)) {
            try {
                if (!Array.isArray(accels)) {
                    this.log(`Skipping ${key}: value must be array`);
                    continue;
                }

                if (!this.settings.settings_schema.has_key(key)) {
                    this.log(`Unknown schema key: ${key}`);
                    continue;
                }

                this.settings.set_strv(key, accels);
            } catch (e) {
                this.log(`Failed to apply key ${key}: ${e}`);
            }
        }
    }
}
