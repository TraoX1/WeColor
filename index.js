var cursorx = -1
var cursory = -1
var pixelData = [] 

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

for (var i = 0; i < 256; i ++) { 
    for (var j = 0; j < 256; j++) { 
        pixelData[i * 256 + j] = "#ffffff"
    }
}

async function drawPixel() {
    var canvas = document.getElementById("canvas").getContext("2d");
    var width = document.getElementById("canvas").width
    var height = document.getElementById("canvas").height

    canvas.strokeStyle = 'white';

    for (var i = 0; i < 256; i ++) { 
        if (Math.random() < 0.05) await delay(1).then(() => {})
        for (var j = 0; j < 256; j++) {

            canvas.fillStyle = pixelData[i * 256 + j] || "#ffffff"
            canvas.fillRect(i * 10, j * 10, 10, 10);

            if (i * 256 + j == lastIndex) {
                var x = i + 1
                var y = j + 1
        
                if (pixelData[i * 256 + j] == undefined) return
        
                var rgb = hexToRgb(pixelData[i * 256 + j] || "#ffffff")
        
                var lum = getLuminance(HEXToVBColor(pixelData[i * 256 + j] || "#ffffff"))
        
                canvas.lineWidth = 2;

                canvas.strokeStyle = lum < 20 ? 'white' : 'black';
        
                canvas.beginPath();
                canvas.moveTo((x * 10) - 1, (y * 10) - 1);
                canvas.lineTo(x * 10 - 1, (y - 1) * 10  + 1);
                canvas.stroke();
        
                canvas.beginPath();
                canvas.moveTo(x * 10 - 1, (y - 1) * 10 + 1);
                canvas.lineTo((x - 1) * 10 + 1, (y - 1) * 10 + 1);
                canvas.stroke();
        
                canvas.beginPath();
                canvas.moveTo((x - 1) * 10 + 1, (y - 1) * 10 + 1);
                canvas.lineTo((x - 1) * 10 + 1, y * 10 -1);
                canvas.stroke();
        
                canvas.beginPath();
                canvas.moveTo((x - 1) * 10 + 1, y * 10 - 1);
                canvas.lineTo(x * 10 - 1, y * 10 - 1);
                canvas.stroke();

            }
        }
    }
}


function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
}  

function HEXToVBColor(rrggbb) {
    var bbggrr = rrggbb.substr(4, 2) + rrggbb.substr(2, 2) + rrggbb.substr(0, 2);
    return parseInt(bbggrr, 16);
}

function getLuminance(argb) {
    lum= (   77  * ((argb>>16)&255) 
               + 150 * ((argb>>8)&255) 
               + 29  * ((argb)&255))>>8;
    return lum;
}

var lastIndex = -1

function getPixelPlacePos(event) {
    var rect = event.target.getBoundingClientRect();

    var lastx = event.clientX
    var lasty = event.clientY

    var x = Math.round((event.clientX - 2 - (rect.left - 4)) / document.getElementById("canvas").clientWidth * 256)
    var y = Math.round((event.clientY - 2 - (rect.bottom - 4)) / document.getElementById("canvas").clientHeight * 256) + 256

    cursorx = x
    cursory = y

    var canvas = document.getElementById("canvas").getContext("2d");

    var index = ((cursorx - 1) * 256) + cursory - 1

    if (lastIndex != index || (cursorx == -1 || cursory == -1)) {
        canvas.fillStyle = pixelData[lastIndex]
        var i1 = Math.floor(lastIndex / 256)
        var j1 = lastIndex % 256
        canvas.fillRect(i1 * 10, j1 * 10, 10, 10);
    }

    if (cursorx != -1 && cursory != -1) {

        var x = cursorx
        var y = cursory

        if (pixelData[index] == undefined) return

        var rgb = hexToRgb(pixelData[index])

        var lum = getLuminance(HEXToVBColor(pixelData[index]))

        canvas.lineWidth = 2;

        canvas.strokeStyle = lum < 20 ? 'white' : 'black';

        canvas.beginPath();
        canvas.moveTo((x * 10) - 1, (y * 10) - 1);
        canvas.lineTo(x * 10 - 1, (y - 1) * 10  + 1);
        canvas.stroke();

        canvas.beginPath();
        canvas.moveTo(x * 10 - 1, (y - 1) * 10 + 1);
        canvas.lineTo((x - 1) * 10 + 1, (y - 1) * 10 + 1);
        canvas.stroke();

        canvas.beginPath();
        canvas.moveTo((x - 1) * 10 + 1, (y - 1) * 10 + 1);
        canvas.lineTo((x - 1) * 10 + 1, y * 10 -1);
        canvas.stroke();

        canvas.beginPath();
        canvas.moveTo((x - 1) * 10 + 1, y * 10 - 1);
        canvas.lineTo(x * 10 - 1, y * 10 - 1);
        canvas.stroke();

    }

    lastIndex = index
}

function exitPixelCanvas() {
    var canvas = document.getElementById("canvas").getContext("2d");
    canvas.fillStyle = pixelData[lastIndex]
    canvas.fillRect((Math.floor(lastIndex / 256)) * 10, (lastIndex % 256) * 10, 10, 10);
    down = false
    cursorx = -1
    cursory = -1
    clearInterval(holdInterval)
}

var holdInterval
var down = false

function placePixel(event, down1) {
    down = down1

    if (down == false) {
        clearInterval(holdInterval)
        return
    } else {
        var index1 = lastIndex
        var canvas = document.getElementById("canvas").getContext("2d");
        pixelData[index1] = selectedcolor
        canvas.fillStyle = selectedcolor
        var i1 = Math.floor(index1 / 256)
        var j1 = index1 % 256
        canvas.fillRect(i1 * 10, j1 * 10, 10, 10);
    }

    var last2 = -1

    holdInterval = setInterval(function() {
        var index1 = lastIndex
        var canvas = document.getElementById("canvas").getContext("2d");
        pixelData[index1] = selectedcolor
        canvas.fillStyle = selectedcolor
        var i1 = Math.floor(index1 / 256)
        var j1 = index1 % 256
        canvas.fillRect(i1 * 10, j1 * 10, 10, 10);
    }, 5)
}


function hsvToHex(h, s, v) {
    s /= 256;
    v /= 256;

    let c = v * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = v - c;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return (
        "#" +
        ((1 << 24) | (r << 16) | (g << 8) | b)
            .toString(16)
            .slice(1)
            .toUpperCase()
    );
}

function updateColorPicker(hue) {
    var canvas = document.getElementById("colorpickercanvas").getContext("2d");
    var width = document.getElementById("colorpickercanvas").width
    var height = document.getElementById("colorpickercanvas").height

    canvas.strokeStyle = 'white';

    for (var i = 0; i < 256; i ++) { 
        for (var j = 0; j < 256; j++) {

            canvas.fillStyle = hsvToHex(hue, i, 256-j)
            canvas.fillRect(i * 10, j * 10, 10, 10);
        }
    }
}

function updateColorPicker2() {
    var canvas = document.getElementById("colorpickercanvas2").getContext("2d");
    var width = document.getElementById("colorpickercanvas2").width
    var height = document.getElementById("colorpickercanvas2").height

    canvas.strokeStyle = 'white';

    for (var i = 0; i < 360; i ++) { 
        for (var j = 0; j < 360; j++) {

            canvas.fillStyle = hsvToHex(i, 256, 256)
            canvas.fillRect((i / 360 * 256) * 10, (j / 360 * 256) * 10, 10, 10);
        }
    }
}

hue = 0
selectedcolor = "#000000"

function selectColorPicker(event) {
    var rect = event.target.getBoundingClientRect();

    var x = Math.round((event.clientX - 2 - (rect.left - 4)) / document.getElementById("colorpickercanvas").clientWidth * 256)
    var y = Math.round((event.clientY - 2 - (rect.bottom - 4)) / document.getElementById("colorpickercanvas").clientHeight * 256) + 256

    selectedcolor = hsvToHex(hue, x, 256-y)

    document.getElementById("selectedcolor").style.backgroundColor = selectedcolor
}

function getHuePickerPos(event) {
    var rect = event.target.getBoundingClientRect();

    var x = Math.round((event.clientX - 2 - (rect.left - 4)) / document.getElementById("colorpickercanvas2").clientWidth * 254)

    hue = (x / 256 * 360) - 4
    updateColorPicker(hue)
}

updateColorPicker(0)

updateColorPicker2()

drawPixel()
