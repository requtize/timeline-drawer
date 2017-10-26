/**
 * Copyright (c) 2017 by Adam Banaszkiewicz
 *
 * @license   MIT License
 * @copyright Copyright (c) 2017, Adam Banaszkiewicz
 * @link      https://github.com/requtize/timeline-drawer
 * @author    https://github.com/requtize
 */
(function (w) {
    'use-strict';
    const TimelineDrawer = function(node, data, options) {
        this.node    = node;
        this.data    = data || {};
        this.options = copyObject(options || {}, TimelineDrawer.defaults);

        this.drawer = new Drawer(node);

        this.needResizeCanvas = false;
        this.initiated = false;

        this.init = function () {
            if(this.initiated)
                return this;

            this.initiated = true;

            this.node.style.display = 'block';

            this.registerContainerSizeWatcher();
            this.wrapCanvasIfNeccessary();
        };

        this.draw = function () {
            this.init();
            this.refreshCanvasSize();

            let data  = SourceNormalizer.normalize(this.data, this.options.source);
                data  = this.applyElementsFilter(data);
            let scene = (new Calculator(this.drawer)).calculate(data, this.node.offsetWidth);

            this.drawer.draw(scene);
        };

        this.refresh = function () {
            this.draw();

            return this;
        };

        this.setData = function (data, source) {
            this.data = data;
            this.options.source = source || this.options.source;

            return this;
        };

        this.applyElementsFilter = function (data) {
            let filter = this.options.elementsFilter;

            if(! filter)
                return data;

            let newData  = {
                totalTime: {
                    duration: data.totalTime.duration
                },
                sections: [],
                stops   : []
            };

            for(let i = 0; i < data.sections.length; i++)
            {
                let filtered = filter.apply(this, [ data.sections[i] ]);

                if(filtered)
                {
                    newData.sections.push(filtered);
                }
            }

            for(let i = 0; i < data.stops.length; i++)
            {
                let filtered = filter.apply(this, [ data.stops[i] ]);

                if(filtered)
                {
                    newData.stops.push(filtered);
                }
            }

            return newData;
        };

        this.registerContainerSizeWatcher = function () {
            var self = this;

            $(window).resize(function () {
                self.needResizeCanvas = true;
            });

            setInterval(function () {
                if(self.needResizeCanvas)
                {
                    self.refreshCanvasSize();
                    self.refresh();
                    self.needResizeCanvas = false;
                }
            }, this.options.resizeRefreshPeriod);
        };

        this.refreshCanvasSize = function () {
            this.drawer.setCanvasWidth(this.node.parentNode.clientWidth);
        };

        this.wrapCanvasIfNeccessary = function () {
            if(this.node.parentNode.classList.contains('timeliner-container') === false)
            {
                wrapper = document.createElement('div');
                wrapper.classList.add('timeliner-container');
                wrapper.style.position = 'relative';
                wrapper.style.overflow = 'hidden';

                this.node.parentNode.insertBefore(wrapper, this.node);
                wrapper.appendChild(this.node);
            }
        };
    };

    const SourceNormalizer = (new (function () {
        this.normalizers = [];

        this.init = function () {
            this.normalizers.push({
                name: 'requtize/timer',
                callable: this.normalizeFromRequtizeTimer
            });

            this.normalizers.push({
                name: 'source',
                callable: function (data) {
                    return data;
                }
            });

            return this;
        };

        this.normalize = function (data, type) {
            for(let i = 0; i < this.normalizers.length; i++)
            {
                if(this.normalizers[i].name == type)
                {
                    return this.normalizers[i].callable.apply(this, [ data ]);
                }
            }

            return data;
        };

        this.normalizeFromRequtizeTimer = function (data) {
            let result = {
                totalTime: {
                    duration: getFromObject(data, 'total-time.duration') * 1000
                },
                sections: [],
                stops   : []
            };

            for(let i = 0; i < data.sections.length; i++)
            {
                result.sections.push({
                    id       : getFromObject(data.sections[i], 'name'),
                    labelMain: getFromObject(data.sections[i], 'name'),
                    category : getFromObject(data.sections[i], 'category'),
                    originalData: copyObject(data.sections[i]),
                    periods  : [{
                        labelSub : (getFromObject(data.sections[i], 'duration') * 1000).toFixed(0) + ' ms / ' + bytesToSize(getFromObject(data.sections[i], 'memory')),
                        color    : getFromObject(data.sections[i], 'category-color'),
                        start    : getFromObject(data.sections[i], 'start') * 1000,
                        duration : getFromObject(data.sections[i], 'duration') * 1000
                    }]
                });
            }

            for(let i = 0; i < data.stops.length; i++)
            {
                result.stops.push({
                    labelMain: getFromObject(data.stops[i], 'name'),
                    category : getFromObject(data.stops[i], 'category'),
                    section  : getFromObject(data.stops[i], 'section'),
                    originalData: copyObject(data.stops[i]),
                    periods  : [{
                        labelSub : (getFromObject(data.stops[i], 'duration') * 1000).toFixed(0) + ' ms / ' + bytesToSize(getFromObject(data.stops[i], 'memory')),
                        color    : getFromObject(data.stops[i], 'category-color'),
                        start    : getFromObject(data.stops[i], 'start') * 1000,
                        duration : getFromObject(data.stops[i], 'duration') * 1000
                    }]
                });
            }

            let stops = {};

            for(let i = 0; i < result.stops.length; i++)
            {
                let key = result.stops[i].labelMain + result.stops[i].section + result.stops[i].category;

                if(stops.hasOwnProperty(key))
                {
                    stops[key].periods.push({
                        labelSub : result.stops[i].periods[0].labelSub,
                        start    : result.stops[i].periods[0].start,
                        color    : result.stops[i].periods[0].color,
                        duration : result.stops[i].periods[0].duration
                    });
                }
                else
                {
                    stops[key] = result.stops[i];
                }
            }

            result.stops = [];

            for(let i in stops)
                result.stops.push(stops[i]);

            return result;
        };
    })).init();

    w.TimelineDrawer = TimelineDrawer;
    w.TimelineDrawer.SourceNormalizer = SourceNormalizer;
    w.TimelineDrawer.defaults = {
        /**
         * Allowed sources: default, requtize/timer
         */
        source: 'requtize/timer',
        resizeRefreshPeriod: 250,
        elementsFilter: function (element) { return element; }
    };


    const Calculator = function (drawer) {
        this.drawer = drawer;
        this.data;
        this.maxWidth;

        this.calculate = function (data, maxWidth) {
            this.data     = data;
            this.maxWidth = maxWidth;

            let sectionsAndStops = [];
            let scene = new Scene;

            for(let i = 0; i < this.data.sections.length; i++)
            {
                let section = this.data.sections[i];
                section.stops = [];

                for(let s = 0; s < this.data.stops.length; s++)
                {
                    if(this.data.stops[s].section == section.id)
                    {
                        section.stops.push(this.data.stops[s]);
                    }
                }

                sectionsAndStops.push(section);
            }

            scene.elements = this.transformToElements(sectionsAndStops, scene);
            scene.width    = this.maxWidth;

            return scene;
        };

        this.transformToElements = function (collection, scene) {
            let result = [];
            let offset = 10;

            for(let i = 0; i < collection.length; i++)
            {
                let elm = this.createElement(collection[i], 'section', offset);

                result.push(elm);

                offset += elm.getHeight();

                for(let j = 0; j < collection[i].stops.length; j++)
                {
                    let elm = this.createElement(collection[i].stops[j], 'stop', offset);

                    result.push(elm);

                    offset += elm.getHeight();
                }
            }

            scene.height = offset;

            return result;
        };

        this.createElement = function (source, type, offset) {
            let totalDuration = this.data.totalTime.duration;
            let lines = this.createElementLines(source.periods);
            let elm   = new Element(lines);

            elm.labelMain = source.labelMain;
            elm.labelSub  = source.labelSub;
            elm.category  = source.category;
            elm.type      = type;

            let startXInPixels   = (this.maxWidth * source.periods[0].start) / totalDuration;
            let durationInPixels = (this.maxWidth * source.periods[0].duration) / totalDuration;

            elm.startX = startXInPixels;
            elm.startY = offset;

            let labelMainWidth = this.drawer.measureLabelMainTextWidth(elm.labelMain);

            elm.labelMainX = startXInPixels;
            elm.labelMainY = offset + this.drawer.getLabelMainTextHeight();
            elm.labelMainW = labelMainWidth;
            elm.labelMainH = this.drawer.getLabelMainTextHeight();

            this.positionateElementLines(elm);

            let labelsWidth = elm.labelMainW;

            if(startXInPixels + labelsWidth > this.drawer.getCanvasWidth())
            {
                elm.labelMainX -= startXInPixels + labelsWidth - this.drawer.getCanvasWidth();
            }

            return elm;
        };

        this.createElementLines = function (periods) {
            let totalDuration = this.data.totalTime.duration;
            let lines = [];

            for(let i = 0; i < periods.length; i++)
            {
                let line      = new ElementLine(periods[i].start, periods[i].duration);
                line.color    = periods[i].color;
                line.labelSub = periods[i].labelSub;

                lines.push(line);
            }

            return lines;
        };

        this.positionateElementLines = function (element) {
            let totalDuration = this.data.totalTime.duration;

            for(let i = 0; i < element.lines.length; i++)
            {
                let startXInPixels   = (this.maxWidth * element.lines[i].start) / totalDuration;
                let durationInPixels = (this.maxWidth * element.lines[i].duration) / totalDuration;

                element.lines[i].lineX = startXInPixels;
                element.lines[i].lineY = element.labelMainY + this.drawer.getLabelMainTextHeight() + element.labelMainMargin + element.labelSubMargin;
                element.lines[i].lineW = durationInPixels;
                element.lines[i].lineH = this.drawer.getLineHeight();

                if(element.lines[i].labelSub)
                {
                    let labelSubWidth = this.drawer.measureLabelSubTextWidth(element.lines[i].labelSub);

                    element.lines[i].labelSubX = startXInPixels;
                    element.lines[i].labelSubY = element.labelMainY + this.drawer.getLabelMainTextHeight() + element.labelMainMargin;
                    element.lines[i].labelSubW = labelSubWidth;
                    element.lines[i].labelSubH = this.drawer.getLabelSubTextHeight();
                }
            }
        };
    };



    const Drawer = function (node) {
        this.canvas = node;
        this.ctx    = node.getContext('2d');

        this.draw = function (scene) {
            this.clear();
            this.setCanvasHeight(scene.height);
            this.createBackgroundColor();

            let elements = scene.getElements();

            for(let i = 0; i < elements.length; i++)
            {
                this.drawElementSeparators(elements[i]);
            }

            for(let i = 0; i < elements.length; i++)
            {
                this.drawElement(elements[i]);
            }
        };

        this.drawElementSeparators = function (element) {
            if(element.type === 'section')
            {
                for(let i = 0; i < element.lines.length; i++)
                {
                    let line = element.lines[i];

                    this.drawSectionLine(line.lineX);
                    this.drawSectionLine(line.lineX + line.lineW);
                }
            }

            this.drawSeparatorLine(element.lines[0].lineY + element.padding + this.getLineHeight());
        };

        this.drawElement = function (element) {
            this.setCtxLabelMainStyle();
            this.ctx.fillText(element.labelMain, element.labelMainX, element.labelMainY - 3);

            if(element.labelSub)
            {
                this.setCtxLabelSubStyle();
                this.ctx.fillText(element.labelSub, element.labelSubX, element.labelSubY - 3);
            }

            for(let i = 0; i < element.lines.length; i++)
            {
                let line = element.lines[i];

                if(element.type === 'section')
                {
                    this.setLineStyle(line.color);
                    this.drawTriangle(line.lineX, line.lineY, 'left');
                    this.drawTriangle(line.lineX + line.lineW, line.lineY, 'right');
                }
                else
                {
                    this.setLineStyle(line.color);
                    this.drawPipe(line.lineX, line.lineY, 'left');
                    this.drawPipe(line.lineX + line.lineW, line.lineY, 'right');
                }

                if(line.renderLabelSub)
                {
                    this.setCtxLabelSubStyle();
                    this.ctx.fillText(line.labelSub, line.labelSubX, line.labelSubY - 3);
                }

                this.ctx.fillStyle   = line.color;
                this.ctx.strokeStyle = line.color;

                this.ctx.beginPath();
                this.ctx.moveTo(line.lineX, line.lineY);
                this.ctx.lineTo(line.lineX + line.lineW, line.lineY);
                this.ctx.lineTo(line.lineX + line.lineW, line.lineY + line.lineH);
                this.ctx.lineTo(line.lineX, line.lineY + line.lineH);
                this.ctx.fill();
                this.ctx.closePath();
            }
        };

        this.drawPipe = function (x, y, side) {
            let width = 1;
            let height = 7;
            let offsetX = 0;

            if(side === 'right')
                offsetX = -width;

            this.ctx.beginPath();
            this.ctx.moveTo(x + offsetX, y);
            this.ctx.lineTo(x + width + offsetX, y);
            this.ctx.lineTo(x + width + offsetX, y + height);
            this.ctx.lineTo(x + offsetX, y + height);
            this.ctx.fill();
            this.ctx.closePath();
        };

        this.drawTriangle = function (x, y, side) {
            let width  = 7;
            let height = 10;

            this.ctx.beginPath();

            if(side === 'right')
            {
                this.ctx.moveTo(x - width, y + (this.getLineHeight() / 2));
                this.ctx.lineTo(x, y - (height / 2) + (this.getLineHeight() / 2));
                this.ctx.lineTo(x, y + (height / 2) + (this.getLineHeight() / 2));
                this.ctx.lineTo(x - width, y + (this.getLineHeight() / 2));
            }
            else
            {
                this.ctx.moveTo(x + width, y + (this.getLineHeight() / 2));
                this.ctx.lineTo(x, y + (height / 2) + (this.getLineHeight() / 2));
                this.ctx.lineTo(x, y - (height / 2) + (this.getLineHeight() / 2));
                this.ctx.lineTo(x + width, y + (this.getLineHeight() / 2));
            }

            this.ctx.fill();
            this.ctx.closePath();
        };

        this.drawSeparatorLine = function (y) {
            this.ctx.fillStyle = '#f1f1f1';
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.getCanvasWidth(), y);
            this.ctx.lineTo(this.getCanvasWidth(), y + 1);
            this.ctx.lineTo(0, y + 1);
            this.ctx.fill();
            this.ctx.closePath();
        };

        this.drawSectionLine = function (x) {
            this.ctx.fillStyle = '#f1f1f1';
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x + 1, 0);
            this.ctx.lineTo(x + 1, this.getCanvasHeight());
            this.ctx.lineTo(x, this.getCanvasHeight());
            this.ctx.fill();
            this.ctx.closePath();
        };

        this.clear = function () {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        };

        this.createBackgroundColor = function () {
            this.ctx.fillStyle = '#fbfbfb';
            this.ctx.fillRect(0, 0, this.getCanvasWidth(), this.getCanvasHeight());
        };

        this.measureLabelMainTextWidth = function (text) {
            this.setCtxLabelMainStyle();

            return this.ctx.measureText(text).width;
        };

        this.measureLabelSubTextWidth = function (text) {
            this.setCtxLabelSubStyle();

            return this.ctx.measureText(text).width;
        };

        this.setLineStyle = function (color) {
            this.ctx.fillStyle = color;
        };

        this.setCtxLabelMainStyle = function () {
            this.ctx.fillStyle = '#444';
            this.ctx.font = 'bold ' + this.getLabelMainTextHeight() + 'px Arial';
        };

        this.setCtxLabelSubStyle = function () {
            this.ctx.fillStyle = '#888';
            this.ctx.font = this.getLabelSubTextHeight() + 'px Arial';
        };

        this.getLabelMainTextHeight = function () {
            return 13;
        };

        this.getLabelSubTextHeight = function () {
            return 10;
        };

        this.getLineHeight = function () {
            return 3;
        };

        this.setCanvasHeight = function (height) {
            this.canvas.setAttribute('height', height + 'px');
        };

        this.setCanvasWidth = function (width) {
            this.canvas.setAttribute('width', width + 'px');
        };

        this.getCanvasWidth = function () {
            return this.canvas.width;
        };

        this.getCanvasHeight = function () {
            return this.canvas.height;
        };
    };

    const Scene = function () {
        this.elements;
        this.width;
        this.height;

        this.getElements = function () {
            return this.elements;
        };
    };

    const Element = function (lines) {
        this.lines = lines;

        this.startX = null;
        this.startY = null;

        this.labelMainX = null;
        this.labelMainY = null;
        this.labelMainW = null;
        this.labelMainH = null;

        this.padding = 10;
        this.labelMainMargin = 2;
        this.labelSubMargin  = 2;

        this.type      = 'stop';
        this.labelMain = '';
        this.category  = null;

        this.appendLine = function (line) {
            this.lines.push(line);

            return this;
        };

        this.getHeight = function () {
            return this.labelMainH
            + (this.lines.length ? this.lines[0].lineH : 0)
            + (this.lines.length ? this.lines[0].labelSubH : 0)
            + (this.padding * 2)
            + this.labelMainMargin
            + this.labelSubMargin;
        };
    };

    const ElementLine = function (start, duration) {
        this.start    = start;
        this.duration = duration;

        this.lineX = null;
        this.lineY = null;
        this.lineW = null;
        this.lineH = null;

        this.labelSubX = null;
        this.labelSubY = null;
        this.labelSubW = null;
        this.labelSubH = null;

        this.renderLabelSub = true;

        this.labelSub = '';
        this.color    = '#666666';
    };

    const bytesToSize = function (bytes) {
        if(bytes == 0)
            return '0b';

        let sizes = ['b', 'KB', 'MB', 'GB', 'TB'];
        let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    };

    const copyObject = function (source, destination) {
        destination = destination || {};

        for(let i in source)
        {
            if(typeof source[i] === 'object')
            {
                destination[i] = copyObject(source[i]);
            }
            else
            {
                destination[i] = source[i];
            }
        }

        return destination;
    };

    const getFromObject = function (source, dotn, def) {
        let result  = source;
        let indexes = dotn.split('.');

        for(let i = 0; i < indexes.length; i++)
        {
            if(result.hasOwnProperty(indexes[i]))
            {
                result = result[indexes[i]];
            }
            else
            {
                return def;
            }
        }

        return result;
    };
})(window);
