# modular-dm
A data-first, event driven, parent-child structured data model for NodeJS compatible with [modular-ui](https://github.com/bccsa/modular-ui)'s data model.

## Installing modular-dm


## Creating control classes
Create a directory for your data model classes (e.g. ```controls```). The javascript file names should match the class name defined in the class javascript files.

```controls/house.js```
```javascript
const { dm } = require('../modular-dm');

class house extends dm {
    constructor() {
        super();
        this.streetNumber = "";
    }

    Init() {
        // Initialization logic. This function is called after control creation.
    }
}

module.exports = house;
```

```controls/room.js```
```javascript
const { dm } = require('../modular-dm');

class room extends dm {
    constructor() {
        super();
        this.doors = 1;
        this.windows = 1;
    }

    Init() {
        // Initialization logic. This function is called after control creation.
    }
}

module.exports = room;
```

## Creating a data model
```index.js```
```javascript
const { dmTopLevelContainer } = import('./modular-dm');

// Path to modular-dm control class files (passed to top level container) should be the absolute path to the control files directory
// or the relative path from the directory where modular-dm is installed.
var controls = dmTopLevelContainer('../controls')

// Create the data model
controls.Set({
    house1: {
        controlType: 'house',
        room1: {
            controlType: 'room',
            windows: 2,
        },
        room2: {
            controlType: 'room'
            doors: 2,
        }
    },
    house2: {
        controlType: 'house',
        room1: {
            controlType: 'room',
            windows: 3,
            doors: 2
        },
        room2: {
            controlType: 'room'
            doors: 2,
        }
    }
});
```

## Event subscription
# control.on()

Explain options { immeditate: true }.

# To do
* Document SetAccess()
* Document event subscription (on & once) options
* Unsubscribe from caller 'remove' event on event unsubscription