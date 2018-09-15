'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api')
const lib = require('./Lib/Lib.js')

var allDevices;
var sModeDevice;
var aModeDevice;

class DeviceTimer extends Homey.App {
	
    onInit() {
        Homey.ManagerApi.realtime("nl.ketra.devicetimer","Started")
        this.log('MyApp is running...');
        this.enumerateDevices();
        this.MakeCron();
    }

    MakeCron() {
        var cronName = "MotionOff"
        Homey.ManagerCron.unregisterAllTasks()
            .then(result => {
                this.log('Cron job deleted successfully');
            }).catch(error => {
                this.error(`Cron job deletion failed (${error}`);
            });

        Homey.ManagerCron.getTask(cronName)
            .then(task => {
                this.log("The task exists: " + cronName);
                task.on('run', () => lib.TurnOffDevices());
            })
            .catch(err => {
                if (err.code == 404) {
                    this.log("The task has not been registered yet, registering task: " + cronName);
                    Homey.ManagerCron.registerTask(cronName, "*/30 * * * * *",null)
                        .then(task => {
                            task.on('run', () => lib.TurnOffDevices());
                        })
                        .catch(err => {
                            this.log(`problem with registering cronjob: ${err.message}`);
                        });
                } else {
                    this.log(`other cron error: ${err.message}`);
                }
            });
    }
    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
        Homey.ManagerApi.realtime("nl.ketra.devicetimer", arguments)
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }
    getApi() {
        if (!this.api) {
            this.api = HomeyAPI.forCurrentHomey();
        }
        return this.api;
    }
	async getDevices() {
        const api = await this.getApi();
        allDevices = await api.devices.getDevices();
        return allDevices;
    }
    async enumerateDevices() {
        // Get the homey object
        const api = await this.getApi();
        // Subscribe to realtime events and set all devices global
        // await api.devices.subscribe();
        api.devices.on('device.create', async (id) => {
            await this.log('New device found!')
            const device = await api.devices.getDevice({
                id: id
            })
            await this.addDevice(device);
        });
        api.devices.on('device.delete', async (id) => {
            await this.log('Device deleted!: ')
        });
        allDevices = await api.devices.getDevices();

        for (let device in allDevices) {
            this.addDevice(allDevices[device], api)
        };

        this.log('Enumerating devices done.')
    }
	    // Add device function, only motion- and contact sensors are added
    addDevice(device, api) {
        if (device.data.id === 'sMode') {
            sModeDevice = device;
            this.log('Found Mode Switch:          ' + device.name)
            this.log('Variabele:                  ' + sModeDevice.name)
        }
        //if (device.class === 'sensor' && 'alarm_motion' in device.capabilities) {
        if ('alarm_motion' in device.capabilities && device.name.substring(0, 3) == 'PIR') {
            this.log('Found motion sensor:        ' + device.name)
            lib.attachEventListener(device,'motion')
        }
    }


}

module.exports = DeviceTimer;
