// =====================================
// Modular Data Model for NodeJS
//
// Copyright BCC South Africa
// =====================================

const EventEmitter = require('events');

/**
 * modular-dm base class (data model base class)
 * @extends EventEmitter
 * @class
 * @constructor
 */
class dm extends EventEmitter {
    /**
     * modular-dm base class (data model base class)
     */
    constructor() {
        super();
        /**
         * The name of the class. This property should not be set in code.
         * @type {string}
         */
        this.controlType = this.constructor.name;
        /**
         * Special property indicating the name of the control. This property should not be set in code.
         * @type {string}
         */
        this._controlName = "";
        /**
         * When true, excludes this control and subsequent child controls' data from GetData() results and 'data' events.
         * @type {boolean}
         */
        this.hideData = false;
        /**
         * When set to true through SetData(), removes this control (or the child control passed to) from the DOM and from the modular-ui data model.
         * @type {boolean}
         */
        this.remove = undefined;
        /**
         * List of child controls. This should not be set in code.
         * @type {object}
         */
        this._controls = {};
        /**
         * List of properties equipped with getters and setters. This should not be set / modified in code
         * @type {object}
         */
        this._properties = {};
        /**
         * Reference to the parent of this control. This should not be set in code.
         * @type {object}
         */
        this._parent = undefined;
        /**
         * Reference to the top level parent. This should not be set in code.
         * @type {object}
         */
        this._topLevelParent = undefined;
        /**
         * Special property containing the path to the modular-dm control classes.
         * @type {string}
         */
        this._path = "";
    }

    // -------------------------------------
    // Overridden functions
    // -------------------------------------

    /**
     * Emit an event
     * @param {string} eventName 
     * @param {*} data - Data to be emitted
     * @param {string} scope - [Optional] local: Only emit on this control; bubble: Emit on this control and all parent controls; top: Only emit on top level parent control; local_top: Emit on both this control and top level parent control; (Default: local)
     */
    emit(eventName, data, scope = 'local') {
        // local emit
        if (scope == 'local' || scope == 'local_top' || scope == 'bubble') {
            super.emit(eventName, data);
        }

        // parent control emit
        if (scope == 'bubble' && this._parent) {
            this._parent.emit(eventName, data, scope);
        }

        // top level control emit
        if (scope == 'top' || scope == 'local_top') {
            this._topLevelParent.emit(eventName, data);
        }
    }

    /**
     * Adds the listener function to the end of the listeners array for the event named eventName. No checks are made to see if the listener has already been added. Multiple calls passing the same combination of eventNameand listener will result in the listener being added, and called, multiple times.
     * @param {string} eventName 
     * @param {*} listener - callback function
     * @param {*} options - Optional - Only for class property change events: Optional: { immediate: true } - Calls the 'listener' callback function immediately on subscription with the current value of the property (if existing).
     */
    on(eventName, listener, options = {}) {
        super.on(eventName, listener);

        // Call the immediate callback
        if (options && options.immediate && this[eventName] != undefined) {
            listener(this[eventName]);
        }
    }

    // -------------------------------------
    // Override Functions
    // -------------------------------------

    /**
     * Overridable method that is called directly after control creation. The [controlName] event is emitted on the control's parent directly after Init() is called. The Init() method can be overridden to add initialisation logic to extentions of the modular-dm base class.
     */
    Init() {

    }

    // -------------------------------------
    // Core functions
    // -------------------------------------

    /**
     * Sets a javascript data object, and updates values, creates and removes controls as applicable.
     * @param {object} data 
     */
    Set(data) {
        if (data && typeof data == 'object') {
            Object.keys(data).forEach((k) => {
                // Check for remove command
                if (k == "remove") {
                    if (data[k] == true) {
                        this._parent.RemoveChild(this._controlName);
                    }
                }
                // Ignore invalid and special keys
                else if (k[0] != "_" && k != "controlType") {
                    // Update this control's settable (not starting with "_") properties
                    if (
                        this[k] != undefined &&
                        (typeof this[k] == "number" ||
                            typeof this[k] == "string" ||
                            typeof this[k] == "boolean" ||
                            Array.isArray(this[k]))) {
                        if (data[k] != null && data[k] != undefined) {
                            this[k] = data[k];
                        }
                        else {
                            // Prevent properties to be set to undefined or null
                            this[k] = `${data[k]}`;
                        }
                    }
                    // Update child controls. If a child control shares the name of a settable property, the child control will not receive data.
                    else if (this._controls[k] != undefined) {
                        this._controls[k].Set(data[k]);
                    }
                    // Create a new child control if the passed data has controlType set. If this control is not ready yet (Init did not run yet),
                    else if (data[k] != null && data[k].controlType != undefined) {
                        this._createControl(data[k], k);
                    }
                }
            });
        }
    }

    /**
     * Get control data as an javascript object
     * @param {Object} options - { sparse: false/true (true [default]: Do not return empty properties; false: Return empty properties;) }
     * @returns 
     */
    Get(options = { sparse: true }) {
        var data = {};

        // Get own properties
        Object.getOwnPropertyNames(this._properties).forEach((k) => {
            if (options.sparse && this._properties[k] != '' || !options.sparse) {
                data[k] = this._properties[k];
            }
        });

        // Get child controls properties
        Object.keys(this._controls).forEach((k) => {
            if (
                this._controls[k].Get() != undefined &&
                !this._controls[k].hideData
            ) {
                data[k] = this._controls[k].Get();
            }
        });

        return data;
    }

    /**
     * Remove child control
     * @param {*} control - Name of the child control
     */
    RemoveChild(control) {
        if (this._controls[control] != undefined) {
            let c = this._controls[control];
            delete this._controls[control];
            delete this[control];

            // Emit remove event
            c.emit('remove', c);

            // Unregister from all events
            c.clearEvents();
        }
    }

    /**
     * Notifies parent control of a change to the given property or array of properties and triggers the onChange event.
     * @param {*} propertyNames - Single string or array of string property names
     */
    NotifyProperty(propertyNames) {
        let data = {};
        if (Array.isArray(propertyNames)) {
            propertyNames.forEach((p) => {
                if (this[p] != undefined) {
                    data[p] = this[p];
                }
            });
        } else {
            if (this[propertyNames] != undefined) {
                data[propertyNames] = this[propertyNames];
            }
        }

        this._notify(data);
    }

    /**
     * Log events to an event log (exposed as 'log' event on the top level parent)
     * @param {String} message 
     */
    Log(message) {
        this._topLevelParent.emit('log', `${this.constructor.name} | ${this._controlName}: ${message}`);
    }

    // notifies parent of data change, and triggers onChange event.
    _notify(data) {
        if (this._parent != undefined) {
            let n = {
                [this._controlName]: data,
            };

            if (!this.hideData) {
                this._parent._notify(n);
            }
        }

        this.emit("data", data);
    }

    /**
     * Return an existing class from a passed string class name, or try to require the passed name (js file should have the same name)
     * @param {*} name - class name
     * @returns class
     */
    _getDynamicClass(name) {
        // adapted from https://stackoverflow.com/questions/5646279/get-object-class-from-string-name-in-javascript
        let tp = this._topLevelParent;

        if (!tp._cls_[name]) {
            // cache is not ready, fill it up
            if (name.match(/^[a-zA-Z0-9_]+$/)) {
                // proceed only if the name is a single word string
                try {
                    let p = this._path;
                    if (!this._path) p = '';
                    let c = require(`${p}/${name}`);
                    if (c) {
                        tp._cls_[name] = c;
                    }
                }
                catch {
                    return undefined;
                }
            } else {
                return undefined;
            }
        }
        return tp._cls_[name];
    }

    /**
     * Create a new control
     * @param {*} data - control data
     * @param {*} name - control name
     */
    _createControl(data, name) {
        let controlClass = this._getDynamicClass(data.controlType);

        if (controlClass) {
            // Create new control
            let control = new controlClass();
            control._controlName = name;
            control._parent = this;
            control._path = this._path;

            // Set reference to top level parent
            control._topLevelParent = this._topLevelParent;

            // Create getters and setters
            Object.getOwnPropertyNames(control).forEach((k) => {
                // Only return settable (not starting with "_") properties excluding special properties
                if (
                    k[0] != "_" &&
                    (typeof control[k] == "number" ||
                        typeof control[k] == "string" ||
                        typeof control[k] == "boolean" ||
                        Array.isArray(control[k]))
                ) {
                    // Store property value in _properties list
                    control._properties[k] = control[k];

                    // Create getter and setter
                    Object.defineProperty(control, k, {
                        get: function () {
                            return this._properties[k];
                        },
                        set: function (val) {
                            if (this._properties[k] != val) {
                                // Only notify changes
                                this._properties[k] = val;
                                this.emit(k, val);
                                this.NotifyProperty(k);
                            }
                        }
                    });
                }
            });

            // Add new control to controls list
            this._controls[name] = control;

            // Add a direct reference to the control in this control
            this[name] = control;

            // Set control child data
            control.Set(data);

            // Initialise control after setting data initial data
            control.Init();

            // Emit the [controlName] event on this (newly created control's parent)
            this.emit(name, control);
        }
    }
}

/**
 * Top level container for moduler-dm controls
 */
class dmTopLevelContainer extends dm {
    /**
     * Top level container for moduler-dm controls
     * @param {string} path - path to modular-dm control class files. This should be the absolute path to the control files directory or the relative path from the directory where modular-dm is installed.
     */
    constructor(path) {
        super();
        this._path = path;
        this._controlName = 'topLevelContainer';
        this._topLevelParent = this;

        // dynamically loaded class cache
        this._cls_ = {};
    }
}

// Export class
module.exports.dm = dm;
module.exports.dmTopLevelContainer = dmTopLevelContainer;