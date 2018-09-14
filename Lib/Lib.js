'use strict';

const { HomeyAPI } = require('athom-api')
const find = require('lodash.find');


var allDevices;
var sModeDevice;
var aModeDevice;

//External Functions

// this function attaches en eventlistener to a device
module.exports.attachEventListener = function attachEventListener(device, sensorType) {
    device.on('$state', (state => { stateChange(device, state, sensorType) }));
    log('Attached Eventlistener:     ' + device.name)
    log('Fully Monitored device:     ' + device.name)

}

module.exports.TurnOffDevices = async function TurnOffDevices() {
    await GetDevices();
    log('-----------------------------------------------')
    for (let device in allDevices) {
        CheckAndTurnOff(allDevices[device])
    }
}

// this function gets called when a device with an attached eventlistener fires an event.
async function stateChange(Trigger, state, sensorType) {
    log('-----------------------------------------------')
    log('stateChange:            ' + Trigger.name)
    if (state.alarm_motion)
        log('Device Changed state    TriggerMotion')
    else {
        log('Device Changed state    CancelMotion')
        return
    }
    log('Device Sensortype       ' + sensorType)
    await GetDevices();
    var d = new Date().getHours();
    var SearchString = Trigger.name.substring(6);
    if (Trigger.name.substring(3, 4) == 'D') var dimmer = true;
    if (Trigger.name.substring(4, 5) == 'N') var night = true;
    var device = find(allDevices, function (o) { return o.name == SearchString; })
    try {
        if (CheckIfLux(Trigger)) {
            if (CheckIfDimmer(device)) {
                if (night && (d < 5 || d >= 23)) {
                    if (!device.state.onoff) {
                        device.setCapabilityValue('dim', 0.35);
                        device.setCapabilityValue('onoff', true);
                        log('Swithed ' + device.name + ' To 35 percent')
                    }
                    else
                        log("Device Is Already On")
                }
                else {
                    if (!device.state.onoff) {
                        device.setCapabilityValue('dim', 0.75);
                        device.setCapabilityValue('onoff', true);
                        log('Swithed ' + device.name + ' To 75 percent')
                    }
                    else
                        log("Device Is Already On")
                }
            }
            else {
                if (!device.state.onoff) {
                    device.setCapabilityValue('onoff', true);
                    log('Swithed ' + device.name)
                }
                else
                    log("Device Is Already On")
            }
        }
    }
    catch (err) {
        console.error(err)
    }
}

async function GetDevices() {
    const api = await HomeyAPI.forCurrentHomey();
    allDevices = await api.devices.getDevices();
    return allDevices;
}



function CheckAndTurnOff(device) {
    var d = new Date();
    if ('alarm_motion' in device.capabilities && device.name.substring(0, 3) == 'PIR') {
        log("Processing " + device.name)
        var ontime = parseInt(device.name.substring(5, 6))
        var timeon = getMinutesBetweenDates(new Date(device.lastUpdated.alarm_motion), d)
        if (timeon < ontime) {
            log(device.name + " has been on within " + ontime + " Minutes (" + timeon + ")")
        }
        else {
            log(device.name + " has not been on in the last " + ontime + " Minutes")
            if (CheckIfDeviceOn(device, allDevices)) {
                var SearchString = device.name.substring(6)
                var device = find(allDevices, function (o) { return o.name == SearchString; });
                log(device.name + " is on. switching off")
                device.setCapabilityValue('onoff', !device.state.onoff);
            }
        }
    }
}

function log(text) {
    var d = new Date();
    console.log(d.toLocaleString() + " - " + text)
}

function getMinutesBetweenDates(startDate, endDate) {
    //console.log('Checking : '+ startDate + ' Against : ' + endDate)¡
    var diff = endDate.getTime() - startDate.getTime();
    diff = diff / 60000
    return Math.round(diff);
}

function CheckIfDeviceOn(dev, devices) {
    var SearchString = dev.name.substring(6)
    var device = find(devices, function (o) { return o.name == SearchString; });
    log(device.name + " ON? : " + device.state.onoff)
    return device.state.onoff
}


function CheckIfLux(device) {
    if (device.state.measure_luminance != undefined) {
        log("Device has luminance: " + device.state.measure_luminance)
        if (device.state.measure_luminance > 50) return false;
        else return true;
    }
    else {
        return true;
    }
}
function CheckIfDimmer(device) {
    if (device.state.dim != undefined) {
        log("Device is dimmer")
        return true;
    }
    else {
        return false;
    }
}
