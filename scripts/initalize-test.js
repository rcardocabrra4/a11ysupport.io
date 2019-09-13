let fs = require('fs');
let moment = require('moment');
const argv = require('minimist')(process.argv.slice(2));
let ATBrowsers = require('./../data/ATBrowsers');
let currentDateString = moment().format('YYYY-MM-DD');
let dataDir = __dirname+'/../data';

if (!argv.id) {
    console.log('Invalid command.');
    console.log('initialize-test.js --id {test id}');
    process.exit();
}

let testFile = __dirname + '/../data/tests/'+argv.id+'.json';
let test = require(testFile);


test.assertions.forEach(function(assertionLink) {
    var feature = require(__dirname + '/../build/tech/'+assertionLink.feature_id+'.json');

    let assertion_key = feature.assertions.findIndex(obj => obj.id === assertionLink.feature_assertion_id);
    if (assertion_key === false) {
        console.log(assertionLink.feature_assertion_id + ' not found');
        process.exit();
    }

    var assertion = feature.assertions[assertion_key];

    if (!assertionLink.results || argv['clear-all']) {
        assertionLink.results = {};
    }

    for(let at in ATBrowsers.at) {
        if (ATBrowsers.at[at].type === "vc" && !assertion.operation_modes.includes("vc")) {
            //console.log('here');
            // We are not on a VC AT and the assertion is just for VC AT, so skip.
            continue;
        }

        if (!assertionLink.results[at] || argv['clear-all']) {
            assertionLink.results[at] = {
                browsers: {}
            };
        }

        let validBrowsers = ATBrowsers.at[at].core_browsers;
        validBrowsers.forEach(function (browser) {

            //Set support arrays
            if (!assertionLink.results[at].browsers[browser] || argv['clear-all']) {
                assertionLink.results[at].browsers[browser] = {
                    output: []
                };
            }

            switch (assertion.id) {
                case 'convey_change_in_value':
                    if (ATBrowsers.at[at].type === "sr" && assertion.operation_modes.includes('sr/interaction')) {
                        // see if it already exists
                        let found = assertionLink.results[at].browsers[browser].output.findIndex(obj => obj.command === "enter_text");
                        if (-1 === found) {
                            assertionLink.results[at].browsers[browser].output.push({
                                command: "enter_text",
                                output: "\"\"",
                                result: "unknown"
                            });
                        }
                    } else {
                        console.log("expected convey_change_in_value to support sr/interaction ");
                    }
                    break;
                case 'provide_shortcuts':
                    if (ATBrowsers.at[at].type === "sr" && assertion.operation_modes.includes('sr/reading')) {
                        let found = assertionLink.results[at].browsers[browser].output.findIndex(obj => obj.command === "next_form_field");
                        if (-1 === found) {
                            assertionLink.results[at].browsers[browser].output.push({
                                command: "next_form_field",
                                output: "\"\"",
                                result: "unknown"
                            });
                        }
                        if (at === "jaws" || at === "nvda" || at === "vo_macos") {
                            // These support open_element_list
                            let found = assertionLink.results[at].browsers[browser].output.findIndex(obj => obj.command === "open_element_list");
                            if (-1 === found) {
                                assertionLink.results[at].browsers[browser].output.push({
                                    command: "open_element_list",
                                    output: "\"\"",
                                    result: "unknown"
                                });
                            }
                        }
                    } else {
                        console.log("expected convey_change_in_value to support sr/reading ");
                    }
                    break;
                default:
                    if (ATBrowsers.at[at].type === "sr") {
                        var next_item_created = false;

                        if (assertion.operation_modes.includes('sr/reading')) {
                            let found = assertionLink.results[at].browsers[browser].output.findIndex(obj => obj.command === "next_item");
                            if (-1 === found) {
                                assertionLink.results[at].browsers[browser].output.push({
                                    command: "next_item",
                                    from: "before target",
                                    to: "target",
                                    output: "\"\"",
                                    result: "unknown"
                                });
                                next_item_created = true;
                            }
                        }

                        if (assertion.operation_modes.includes('sr/interaction')) {
                            // not all screen readers have next_focusable_item...
                            if (ATBrowsers.at[at].commands.next_focusable_item) {
                                let found = assertionLink.results[at].browsers[browser].output.findIndex(obj => obj.command === "next_focusable_item");
                                if (-1 === found) {
                                    assertionLink.results[at].browsers[browser].output.push({
                                        command: "next_focusable_item",
                                        from: "before target",
                                        to: "target",
                                        output: "\"\"",
                                        result: "unknown"
                                    });
                                }
                            } else if (!next_item_created) {
                                let found = assertionLink.results[at].browsers[browser].output.findIndex(obj => obj.command === "next_item");
                                if (-1 === found) {
                                    assertionLink.results[at].browsers[browser].output.push({
                                        command: "next_item",
                                        from: "before target",
                                        to: "target",
                                        output: "\"\"",
                                        result: "unknown"
                                    });
                                }
                            }
                        }
                    } else if (ATBrowsers.at[at].type === "vc") {
                        if (assertion.id === "convey_name") {
                            let found = assertionLink.results[at].browsers[browser].output.findIndex(obj => obj.command === "activate_actionable_item");
                            if (-1 === found) {
                                assertionLink.results[at].browsers[browser].output.push({
                                    command: "activate_actionable_item",
                                    output: "\"\"",
                                    result: "unknown"
                                });
                            }
                        }

                        if (assertion.id === "convey_role") {
                            let found = assertionLink.results[at].browsers[browser].output.findIndex(obj => obj.command === "click_type");
                            if (-1 === found) {
                                assertionLink.results[at].browsers[browser].output.push({
                                    command: "click_type",
                                    output: "\"\"",
                                    result: "unknown"
                                });
                            }
                        }
                    }

            }

        });
    }

    // Use the latest versions that we have on file.
    var versions = require(__dirname + '/../data/latest_versions.json');
    test.versions = versions;

    var string = JSON.stringify(test, null, 2);
    string = string.replace(/--enter date--/g, currentDateString);

    fs.writeFileSync(testFile, string);
});
