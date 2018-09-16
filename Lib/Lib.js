'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api')
const find = require('lodash.find');


var settings;

//External Functions

// this function attaches en eventlistener to a device
module.exports.attachEventListener = function attachEventListener(device, sensorType) {
    device.on('$state', (state => { stateChange(device, state, sensorType) }));
    log('Attached Eventlistener:     ' + device.name)
}

module.exports.TurnOffDevices = async function TurnOffDevices() {
    settings = Homey.ManagerSettings.get('DevTimerSettings');
    var allDevices = await GetDevices();
    log('-----------------------------------------------')
    logtoall("Checking for devices to turn off")
    for (let device in allDevices) {
        CheckAndTurnOff(allDevices[device], allDevices)
    }
    allDevices = null;
}

// this function gets called when a device with an attached eventlistener fires an event.
async function stateChange(Trigger, state, sensorType) {
    settings = Homey.ManagerSettings.get('DevTimerSettings');
    log('-----------------------------------------------')
    if (state.alarm_motion) {
        logtoall('stateChange:            ' + Trigger.name)
        logtoall('Device Changed state    TriggerMotion')
    }
    else {
        log('stateChange:            ' + Trigger.name)
        return
    }
    
    log('Device Sensortype       ' + sensorType);
    var allDevices = await GetDevices();
    var d = new Date().getHours()
    var begintime = parseInt(settings.begintime.split(':')[0])
    var endtime = parseInt(settings.endtime.split(':')[0])
    var date = new Date()
    Homey.ManagerSettings.set(Trigger.name, date)
    var nightident = Trigger.name.substring(settings.nightlocation, parseInt(settings.nightlocation) + 1)
    var dimident = Trigger.name.substring(settings.dimlocation, parseInt(settings.dimlocation) + 1) 
    var SearchString = Trigger.name.substring(settings.devicenamelocation);

    if (dimident == 'D' && settings.dimmer) var dimmer = true; else var dimmer = false
    if (nightident == 'N' && settings.night) var night = true; else var night = false
    console.log(settings)
    var device = find(allDevices, function (o) { return o.name == SearchString; })
    try {
        if (!device.state.onoff) {
            if (CheckIfLux(Trigger)) {
                if (CheckIfDimmer(device) && dimmer) {
                    if (night && (d < endtime || d >= begintime)) {
                        if (!device.state.onoff) {
                            device.setCapabilityValue('dim', 0.35);
                            device.setCapabilityValue('onoff', true);
                            logtoall('Swithed ' + device.name + ' To 35 percent')
                        }
                        else
                            log("Device Is Already On")
                    }
                    else {
                        if (!device.state.onoff) {
                            device.setCapabilityValue('dim', 0.75);
                            device.setCapabilityValue('onoff', true);
                            logtoall('Swithed ' + device.name + ' To 75 percent')
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
        allDevices = null;
    }
    catch (err) {
        console.error(err)
    }
}

async function GetDevices() {
    const api = await HomeyAPI.forCurrentHomey();
    var allDevices = await api.devices.getDevices();
    return allDevices;
}



function CheckAndTurnOff(device, allDevices) {
    var d = new Date();
    if ('alarm_motion' in device.capabilities && device.name.substring(0, settings.prefix.length) == settings.prefix) {
        log("Processing " + device.name)
        //console.log(device.lastUpdated.alarm_motion)
        var ontime = parseInt(device.name.substring(5, 6))
        var timeon = getMinutesBetweenDates(new Date(GetTimeOn(device)), d)
        if (timeon < ontime) {
            log(device.name + " has been on within " + ontime + " Minutes (" + timeon + ")")
        }
        else {
            log(device.name + " has not been on in the last " + ontime + " Minutes")
            if (CheckIfDeviceOn(device, allDevices)) {
                var SearchString = device.name.substring(6)
                var device = find(allDevices, function (o) { return o.name == SearchString; });
                logtoall(device.name + " is on. switching off")
                device.setCapabilityValue('onoff', !device.state.onoff);
            }
        }
    }
}

function logtoall(text)
{
    var d = new Date();
    console.log(d.toLocaleString() + " - " + text)
    Homey.ManagerApi.realtime("nl.ketra.devicetimer", text)
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

function GetTimeOn(device) {
    try {
        var timeon = new Date(Homey.ManagerSettings.get(device.name))
        if (Homey.ManagerSettings.get(device.name) === undefined)
            timeon = new Date(device.lastUpdated.alarm_motion)
        
    }
    catch (err) {
        console.error(err)
    }
    return timeon;
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
