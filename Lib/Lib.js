'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api')
const find = require('lodash.find');


var settings;

//External Functions

// this function attaches en eventlistener to a device
module.exports.attachEventListener = function attachEventListener(device, sensorType) {
    //device.on('$state', (state => { stateChange(device, state, sensorType) }));
    device.makeCapabilityInstance('alarm_motion',function(device, state) {
                    stateChange(device,state,sensorType)
                }.bind(this, device));
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
    var nightident = Trigger.name.substring(parseInt(settings.nightlocation) - 1, parseInt(settings.nightlocation))
    var dimident = Trigger.name.substring(parseInt(settings.dimlocation) - 1, parseInt(settings.dimlocation))
    var SearchString = Trigger.name.substring(parseInt(settings.devicenamelocation) - 1);

    if (dimident == 'D' && settings.dimmer) var dimmer = true; else var dimmer = false
    if (nightident == 'N' && settings.night) var night = true; else var night = false
    //console.log(settings)
    var device = find(allDevices, function (o) { return o.name == SearchString; })
    try {
        if (!device.capabilitiesObj.onoff.value) {
            if (CheckIfLux(Trigger)) {
                if (CheckIfDimmer(device) && dimmer) {
                    if (night && (d < endtime || d >= begintime)) {
                        if (!device.capabilitiesObj.onoff.value) {
                            device.setCapabilityValue('dim', 0.35);
                            device.setCapabilityValue('onoff', true);
                            logtoall('Swithed ' + device.name + ' To 35 percent')
                        }
                        else
                            log("Device Is Already On")
                    }
                    else {
                        if (!device.capabilitiesObj.onoff.value) {
                            device.setCapabilityValue('dim', 0.75);
                            device.setCapabilityValue('onoff', true);
                            logtoall('Swithed ' + device.name + ' To 75 percent')
                        }
                        else
                            log("Device Is Already On")
                    }
                }
                else {
                    if (!device.capabilitiesObj.onoff.value) {
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



function CheckAndTurnOff(trigger, allDevices) {
    var d = new Date();
    if ('alarm_motion' in trigger.capabilitiesObj && trigger.name.substring(0, settings.prefix.length) == settings.prefix) {
        log("Processing " + trigger.name)
        //console.log(device.lastUpdated.alarm_motion)
        var ontime = parseInt(trigger.name.substring(5, 6))
        var timeon = getMinutesBetweenDates(new Date(GetTimeOn(trigger)), d)
        if (timeon < ontime) {
            log(trigger.name + " has been on within " + ontime + " Minutes (" + timeon + ")")
        }
        else {
            log(trigger.name + " has not been on in the last " + ontime + " Minutes")
            var SearchString = trigger.name.substring(6)
            var device = find(allDevices, function (o) { return o.name == SearchString; });
            //console.log(device)
            if (device)
            {
            if (CheckIfDeviceOn(device) && !trigger.capabilitiesObj.alarm_motion.value) {
                logtoall(device.name + " is on. switching off")
                device.setCapabilityValue('onoff', false);
            }
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

function CheckIfDeviceOn(device) {
      log(device.name + " ON? : " + device.capabilitiesObj.onoff.value)
      return device.capabilitiesObj.onoff.value
}

function GetTimeOn(device) {
    try {
        var timeon = new Date(Homey.ManagerSettings.get(device.name))
        if (Homey.ManagerSettings.get(device.name) === undefined)
            timeon = new Date(device.capabilitiesObj.alarm_motion.lastUpdated)

    }
    catch (err) {
        console.error(err)
    }
    return timeon;
}


function CheckIfLux(device) {
    if (device.device.capabilitiesObj.measure_luminance != undefined) {
        log("Device has luminance: " + device.device.capabilitiesObj.measure_luminance.value)
        if (device.device.capabilitiesObj.measure_luminance.value > 50) return false;
        else return true;
    }
    else {
        return true;
    }
}
function CheckIfDimmer(device) {
    if (device.device.capabilitiesObj.dim != undefined) {
        log("Device is dimmer")
        return true;
    }
    else {
        return false;
    }
}
