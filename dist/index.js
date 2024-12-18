"use strict";
/*
 * Copyright 2018 Paul Reeve <preeve@pdjr.eu>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Rule_1 = require("./Rule");
const ValueClass_1 = require("./ValueClass");
const signalk_libdelta_1 = require("signalk-libdelta");
const PLUGIN_ID = 'range-notifier';
const PLUGIN_NAME = 'pdjr-skplugin-range-notifier';
const PLUGIN_DESCRIPTION = 'Operate switches or raise notifications based on value ranges.';
const PLUGIN_SCHEMA = {
    "type": "object",
    "properties": {
        "rules": {
            "title": "Rules",
            "type": "array",
            "items": {
                "title": "Rule",
                "type": "object",
                "properties": {
                    "name": {
                        "title": "Rule name",
                        "type": "string"
                    },
                    "triggerPath": {
                        "title": "Monitored path",
                        "type": "string"
                    },
                    "lowThreshold": {
                        "title": "Low threshold",
                        "type": "number"
                    },
                    "highThreshold": {
                        "title": "High threshold",
                        "type": "number"
                    },
                    "controlPath": {
                        "title": "Control path",
                        "type": "string"
                    },
                    "inRangeControlValue": {
                        "title": "Control value to use when value on monitored path moves in range",
                        "type": "string",
                        "enum": ["cancel", "normal", "alert", "warn", "alarm", "emergency", "on", "off"]
                    },
                    "lowTransitControlValue": {
                        "title": "Control value to use when value on monitored path moves below low threshold",
                        "type": "string",
                        "enum": ["cancel", "normal", "alert", "warn", "alarm", "emergency", "on", "off"]
                    },
                    "highTransitControlValue": {
                        "title": "Control value to use when value on monitored path moves above high threshold",
                        "type": "string",
                        "enum": ["cancel", "normal", "alert", "warn", "alarm", "emergency", "on", "off"]
                    }
                },
                "required": ["triggerPath", "lowThreshold", "highThreshold"],
            }
        }
    }
};
const PLUGIN_UISCHEMA = {};
module.exports = function (app) {
    var unsubscribes = [];
    var pluginConfiguration = {};
    const plugin = {
        id: PLUGIN_ID,
        name: PLUGIN_NAME,
        description: PLUGIN_DESCRIPTION,
        schema: PLUGIN_SCHEMA,
        uiSchema: PLUGIN_UISCHEMA,
        start: function (options) {
            var delta = new signalk_libdelta_1.Delta(app, plugin.id);
            try {
                pluginConfiguration = makePluginConfiguration(options);
                app.debug(`using configuration: ${JSON.stringify(pluginConfiguration, null, 2)}`);
                if (pluginConfiguration.rules.length > 0) {
                    app.setPluginStatus(`Started: monitoring ${pluginConfiguration.rules.length} trigger path${(pluginConfiguration.rules.length == 1) ? '' : 's'}`);
                    pluginConfiguration.rules.forEach(rule => { app.debug(`applying rule '${rule.name}' to trigger path '${rule.triggerPath}'`); });
                    unsubscribes = pluginConfiguration.rules.map((rule) => (app.streambundle.getSelfStream(rule.triggerPath)
                        .skipDuplicates()
                        .map((value) => { app.debug(`rule '${rule.name}' received value ${value}`); return (value2ValueClass(value, rule)); })
                        .skipDuplicates()
                        .map((valueclass) => { app.debug(`rule '${rule.name}' value classified as '${valueclass.getName()}'`); return (rule.getControlValue(valueclass)); })
                        .onValue((controlValue) => {
                        if (controlValue != rule.lastControlValue) {
                            switch (controlValue.getName()) {
                                case 'cancel':
                                    delta.addValue(rule.controlPath, null).commit().clear();
                                    app.debug(`rule '${rule.name}' cancelling notification on '${rule.controlPath}'`);
                                    rule.lastControlValue = controlValue;
                                    break;
                                case 'undefined':
                                    break;
                                default:
                                    if (controlValue.isSwitch()) {
                                        delta.addValue(rule.controlPath, (controlValue.is('on')) ? 1 : 0).commit().clear();
                                        app.debug(`rule '${rule.name}' switching '${rule.controlPath}' ${controlValue.getName().toUpperCase()}`);
                                    }
                                    else {
                                        delta.addValue(rule.controlPath, { state: controlValue.getName(), method: [], message: '' }).commit().clear();
                                        app.debug(`rule '${rule.name}' issuing '${controlValue.getName()}' notification on '${rule.controlPath}'`);
                                    }
                                    rule.lastControlValue = controlValue;
                                    break;
                            }
                        }
                    })));
                }
                else {
                    app.setPluginStatus('Stopped: configuration includes no valid rules');
                }
            }
            catch (e) {
                app.setPluginStatus('Stopped: plugin configuration error');
                app.setPluginError(e.messge);
            }
            function value2ValueClass(value, rule) {
                if (value <= rule.lowThreshold)
                    return (ValueClass_1.ValueClass.low);
                if (value >= rule.highThreshold)
                    return (ValueClass_1.ValueClass.high);
                return (ValueClass_1.ValueClass.inrange);
            }
        },
        stop: function () {
            unsubscribes.forEach((f) => f());
            unsubscribes = [];
        }
    }; // End of plugin
    function makePluginConfiguration(options) {
        var pluginConfiguration = {};
        if (!options.rules)
            throw new Error('missing \'rules\' property');
        pluginConfiguration.rules = options.rules.map((option) => new Rule_1.Rule(option));
        return (pluginConfiguration);
    }
    return (plugin);
};
