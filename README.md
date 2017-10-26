# TimelineDrawer

Simple JavaScript library that helps You drawe responsive timelines. In co-working with [https://github.com/requtize/code-timer] You can create Your own code execution timeline with simpleness.

## Usage
```js
// Data object from somewhere... maybe from requtize/code-timer)
let data = {};
// CANVAS element node object.
let canvas = document.getElementById('my-canvas');
// Initiate object.
let drawer = new TimelineDrawer(canvas, data);
// Draw timeline on canvas.
drawer.draw();
```

## Data object

The data object contains informations about total duration time of timeline, sections and stops with labels, durations and start-times. Please find bellow simple structure of this object with comments.

```js
{
    totalTime: {
        // Total execution time. The timeline will take this value as max chart time value.
        duration: 100
    },
    // Array with sections. Sections are groups of elements. The sections contains stops.
    sections: [
        {
            // Section ID.
            id: 'string',
            // Label of section - section name.
            labelMain: 'string',
            // Category of section. Can be null.
            category: 'string',
            // Contains one period object to write section line.
            periods: [
                {
                    // Label of period, ie. duration time.
                    labelSub: 'string',
                    // Color of period line.
                    color: 'string',
                    // Start time. Relative to 0, max to totalTime.duration
                    start: 0,
                    // Duration time. Relative to 0, max to totalTime.duration
                    duration: 10
                }
            ]
        }
    ],
    // Array with stops. Every stop contain to section.
    stops: [
        {
            // Section ID.
            section: 'string',
            // Label of stop - stop name.
            labelMain: 'string',
            // Category of stop. Can be null.
            category: 'string',
            // Contains one period object to write section line.
            periods: [
                {
                    // Label of period, ie. duration time.
                    labelSub: 'string',
                    // Color of period line.
                    color: 'string',
                    // Start time. Relative to 0, max to totalTime.duration
                    start: 0,
                    // Duration time. Relative to 0, max to totalTime.duration
                    duration: 10
                }
            ]
        }
    ]
}
```

### Refresh data and redraw timeline

If You want to refresh timeline with new data, use following code.

```js
drawer.setData(newData);
drawer.refresh();
// Or chain
drawer.setData(newData).refresh();
```

### Force resize canvas

Script watches if window resizes, but in special cases You can force refresh size.

```js
drawer.refreshCanvasSize();
```

# Licence

This code is licensed under MIT License.
