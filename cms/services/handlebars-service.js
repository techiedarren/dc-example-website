const uuidv4 = require('uuid/v4');
const Q = require('q');
//Create a standalone Handlebars so other instances do not conflict
const Handlebars = require('handlebars').create();
patchResolvePartial(Handlebars);
registerHelpers(Handlebars);

const MARKER_PREFIX = '\u0001((';
const MARKER_SUFFIX = '))\u0001';


var currentState = null;
function runWithState(state, callback){
    currentState = state;
    callback();
}

function registerHelpers(Handlebars){
    var helpers = require('handlebars-helpers')(
        [
            'array',
            'collection',
            'comparison',
            'date',
            'html',
            'math', 
            'misc',
            'number',
            'object',
            'regex',
            'string',
            'uri'
        ],
        {
            handlebars: Handlebars
        }
    );
}

function patchResolvePartial(Handlebars){
    Handlebars.VM.resolvePartial = function(partial, context, options){
        if (!partial) {
            partialName = options.name;
        } else if (!partial.call && !options.name) {
            // This is a dynamic partial that returned a string
            partialName = partial;
        }
        return function(){
            var id = uuidv4();
            currentState.markers[id] = processSingleTemplate(partialName, context, currentState);
            return MARKER_PREFIX + id + MARKER_SUFFIX;
        }
    }
}

function getMarkers(text){
    var result = [];
    var io = 0;
    while((io = text.indexOf(MARKER_PREFIX, io)) != -1){
        io += MARKER_PREFIX.length;
        var end = text.indexOf(MARKER_SUFFIX, io);
        if(end == -1){
            throw new Error('unable to process nested template');
        }else{
            result.push(text.slice(io, end));
        }
    }
    return result;
}

function replaceMarker(text, id, value){
    return text.split(MARKER_PREFIX + id + MARKER_SUFFIX).join(value);
}


function processSingleTemplate(templateName, data, state){
    state.includes++;
    if(state.includes > 100){
        return Q.reject(new Error("maximum template recursion reached"));
    }

    return state.config.getTemplate(templateName)
        .then(function(template){
            
            var output;
            runWithState(state, function(){
                var compiled = Handlebars.compile(template, {srcName: templateName});
                output = compiled(data);
            });

            var markers = getMarkers(output);
            var markerPromises = markers.map(function(id){
                return state.markers[id];
            });
            
            return Q.allSettled(markerPromises).then(function(results){
                results.forEach(function (result, i) {
                    var id = markers[i];
                    if (result.state === "fulfilled") {
                        var value = result.value;
                        output = replaceMarker(output, id, value);
                    } else {
                        //Error
                        throw result.reason;

                        //Or blank?
                        //output = replaceMarker(output, id, '');
                    }
                });
                return output;
            });

        }, function(err){
            //Remap the error to a friendly message
            throw new Error('unable to find template ' + templateName);
        });
}

function process(templateName, data, config){
    var state = {
        config: config,
        markers: {},
        includes: 0
    };
    return processSingleTemplate(templateName, data, state);
}

module.exports = {
    process: process
}