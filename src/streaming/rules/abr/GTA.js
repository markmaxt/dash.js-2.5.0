/*******************************************************
 * Copyright (C) 2017-2018 GTA by Abdelhak Bentaleb, NUS, bentaleb@comp.nus.edu.sg
 * 
 * This file is part of GTA.
 * 
 * GTA can not be copied and/or distributed without the express
 * permission of Abdelhak Bentaleb and NUS.
 *
 * Written by Abdelhak Bentaleb <bentaleb@comp.nus.edu.sg>, 2018.
 *******************************************************/

import SwitchRequest from '../SwitchRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import MediaPlayerModel from '../../models/MediaPlayerModel';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest';
import DashAdapter from '../../../dash/DashAdapter';
import Debug from '../../../core/Debug';
import BufferController from '../../controllers/BufferController';
import AbrController from '../../controllers/AbrController';
/* import {getcoalitionparm,getnetstatus,bitratequalitymap,computeQoE,getutilitymetrics,getFragmentinfo,getGTA} from '../../../../samples/dash-if-reference-player/app/StorStatus.js'; */
// Intialization

function getcoalitionparm() {}
function getnetstatus() {}
function bitratequalitymap() {}
function computeQoE() {}
function getutilitymetrics() {}
function getFragmentinfo() {}
function getGTA() {}

const BUFFER_MAX_GTA = 36;
const BUFFER_MIN_GTA = 8;
const MAX_MEASUREMENTS_TO_KEEP = 20;
const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 3;
const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 4;
const AVERAGE_LATENCY_SAMPLES = AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD;
const CACHE_LOAD_THRESHOLD_VIDEO = 50;
const CACHE_LOAD_THRESHOLD_AUDIO = 5;
const CACHE_LOAD_THRESHOLD_LATENCY = 50;
const THROUGHPUT_DECREASE_SCALE = 1.3;
const THROUGHPUT_INCREASE_SCALE = 1.3;
const ABANDON_MULTIPLIER = 1.8;
const GRACE_TIME_THRESHOLD = 500;
const MIN_LENGTH_TO_AVERAGE = 5;


function GTA(config) {
    const context = this.context;
    const log = Debug(context).getInstance().log;
    const dashMetrics = config.dashMetrics;
    const metricsModel = config.metricsModel;
    let instance,
        mediaPlayerModel,
        throughputArray,
        latencyArray,
        adapter;
    let coalitionformvar;
    let Resolution;
    let Contenet;
    let Service;
    let Cl;
    let downloadTimeInMilliseconds;
    let latencyTimeInMilliseconds;
    let netwrokstatus;
    let BWeType;
    let BWtotal; 
    let CongestionLevel;
    let latency;
    let AvgBWEstimated;
    let lastRequestThroughput;
    let stepbw;
    let BWcross;
    let N;
    let NCl;
    let actionMAX;
    let step;
    let TotalSSIMplusQT;
    let AvgSSIMplusQT;
    let AvgSSIMplusQTSwitch;
    let TotalAvgSSIMplusQTSwitch;
    let AvgEvtStalls;
    let AvgEvtStallsDuration;
    let PreviousSSIMplusQT;
    let strategiesOpt;
    let actionOthers;
    let previousQtMax;
    let bitratesetOther;
    let TotalSSIMplusQTOther;
    let AvgSSIMplusQTOther;
    let AvgSSIMplusQTSwitchOther;
    let TotalAvgSSIMplusQTSwitchOther;
    let PreviousSSIMplusQTOther;
    let AvgEvtStallsOther;
    let AvgEvtStallsDurationOther;
    let UtilitySTEPOthers;
    let StepUtilityOTHStor;
    let strategiesOther;
    let alphaPower; 
    let BargainingPower;
    let BargainingOutcome;
    let OutcomeResultBitrate;
    let OutcomeResultQuality;
    let OutcomeResultUtility;
    let BOutcome;
    let BOutcomeMAX;
    let BargainingOutcomeALL;
    let BargainingOutcomeOpt;
    let Algorithm;
    let BitrateSelected;
    let newBitrateList;
    let bufferStateDict;
    let newRATEIndex;
    let fragmentDict;
    let throughputArrayV2;
    let abandonDict;
    let ConsensusUpdatingBitratePrevious;
    let ConsensusUpdatingSSIMplusPrevious;
    let lockCurrent;
	
    function setup() {
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        adapter = DashAdapter(context).getInstance();
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        console.log('--------GTA Scheme By ABDELHAK BENTALEB--------');
        // INITIALIAZTION Start here
        coalitionformvar = getcoalitionparm();
        Resolution = coalitionformvar[0];
        Contenet = coalitionformvar[1];
        Service = coalitionformvar[2];
        Cl = CoalitionFormation(Resolution,Contenet,Service);
        downloadTimeInMilliseconds = 0;
        latencyTimeInMilliseconds = 0;
        netwrokstatus = 0;
        BWeType = ['EWMA','PANDA','dash','Storstatus','other'];
        BWtotal = 662481; // change it to 700 Because of a bug in dash.js v2.4.1;
        CongestionLevel = 0;
        throughputArray = [];
        latencyArray = [];
        latency = 0;
        AvgBWEstimated = 0;
        lastRequestThroughput = 0;
        stepbw = 0;
        BWcross = 0;
        N = 1;// Total Number of players
        NCl = 1;
        actionMAX = [];
        step = 2;
        TotalSSIMplusQT = 0;
        AvgSSIMplusQT = 0;
        AvgSSIMplusQTSwitch = 0;
        TotalAvgSSIMplusQTSwitch = 0;
        AvgEvtStalls = 0;
        AvgEvtStallsDuration = 0;
        PreviousSSIMplusQT = 0;
        strategiesOpt = [];
        actionOthers = [];
        previousQtMax = 0;
        bitratesetOther = [];
        TotalSSIMplusQTOther = [];
        AvgSSIMplusQTOther = [];
        AvgSSIMplusQTSwitchOther = [];
        TotalAvgSSIMplusQTSwitchOther = [];
        PreviousSSIMplusQTOther = [];
        AvgEvtStallsOther = [];
        AvgEvtStallsDurationOther = [];
        UtilitySTEPOthers = [];
        StepUtilityOTHStor = [];
        strategiesOther = [];
        alphaPower = 1 / NCl;
        BargainingPower = ['SVF','PF','EF','MMF','Random']; // for now We select only EF that devide alph equally between set of each coalition members
        BargainingOutcome = [];
        OutcomeResultBitrate = [];
        OutcomeResultQuality = [];
        OutcomeResultUtility = [];
        BOutcome = [];
        BOutcomeMAX= [];
        BargainingOutcomeALL = [];
        BargainingOutcomeOpt = [];
        newBitrateList = [];
        Algorithm = 'NOCoalitionBitrate';
        BitrateSelected = 0;
        bufferStateDict = {};
        newRATEIndex = 0;
        abandonDict = {};
        throughputArrayV2 = [];
        fragmentDict = {};
        ConsensusUpdatingBitratePrevious = 0;
        ConsensusUpdatingSSIMplusPrevious = 0;
        lockCurrent = false; 
    }

    // Other Functions
    function CoalitionFormation(DR, CT, SPT) {
        let coalitionID = 0; // No coalition assignied
        let SSIMplusQT = 0;
        let MaxBitrate = 0;
        if (DR == '1080p' &&  CT == 'Animation') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 5;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.964;
                        MaxBitrate = 2400;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.969;
                        MaxBitrate = 2900;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.974;
                        MaxBitrate = 3300;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.981;
                        MaxBitrate = 3600;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.999;
                        MaxBitrate = 4000;
                        break;
                    }
            }
        }
        if (DR == '1080p' &&  CT == 'Movie') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 5;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.943;
                        MaxBitrate = 3000;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.951;
                        MaxBitrate = 3500;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.969;
                        MaxBitrate = 4000;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.975;
                        MaxBitrate = 5000;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.99;
                        MaxBitrate = 6000;
                        break;
                    }
            }
        }
        if (DR == '1080p' &&  CT == 'Documentary') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 5;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.937;
                        MaxBitrate = 3200;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.945;
                        MaxBitrate = 3500;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.96;
                        MaxBitrate = 3700;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.979;
                        MaxBitrate = 4500;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.999;
                        MaxBitrate = 6000;
                        break;
                    }
            }
        }
        if (DR == '1080p' &&  CT == 'News') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 5;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.937;
                        MaxBitrate = 2500;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.948;
                        MaxBitrate = 3000;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.957;
                        MaxBitrate = 3500;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.97;
                        MaxBitrate = 3700;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.99;
                        MaxBitrate = 4000;
                        break;
                    }
            }
        }
        if (DR == '1080p' &&  CT == 'Sport') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 5;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.92;
                        MaxBitrate = 3000;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.94;
                        MaxBitrate = 3500;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.95;
                        MaxBitrate = 4500;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.987;
                        MaxBitrate = 5000;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.999;
                        MaxBitrate = 6000;
                        break;
                    }
            }
        }
        if (DR == '720p' &&  CT == 'Animation') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 4;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.949;
                        MaxBitrate = 900;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.952;
                        MaxBitrate = 1200;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.957;
                        MaxBitrate = 1500;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.96;
                        MaxBitrate = 2000;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.963;
                        MaxBitrate = 2100;
                        break;
                    }
            }
        }
        if (DR == '720p' &&  CT == 'Movie') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 4;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.924;
                        MaxBitrate = 1500;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.927;
                        MaxBitrate = 1500;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.93;
                        MaxBitrate = 2000;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.934;
                        MaxBitrate = 2500;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.938;
                        MaxBitrate = 2500;
                        break;
                    }
            }
        }
        if (DR == '720p' &&  CT == 'Documentary') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 4;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.833;
                        MaxBitrate = 1300;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.853;
                        MaxBitrate = 1500;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.875;
                        MaxBitrate = 1800;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.9;
                        MaxBitrate = 2100;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.924;
                        MaxBitrate = 2500;
                        break;
                    }
            }
        }
        if (DR == '720p' &&  CT == 'News') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 4;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.9;
                        MaxBitrate = 700;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.907;
                        MaxBitrate = 900;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.916;
                        MaxBitrate = 1200;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.924;
                        MaxBitrate = 1500;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.933;
                        MaxBitrate = 2000;
                        break;
                    }
            }
        }
        if (DR == '720p' &&  CT == 'Sport') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 4;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.87;
                        MaxBitrate = 1200;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.882;
                        MaxBitrate = 1200;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.893;
                        MaxBitrate = 1500;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.896;
                        MaxBitrate = 2000;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.905;
                        MaxBitrate = 2500;
                        break;
                    }
            }
        }
        if (DR == '480p' &&  CT == 'Animation') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 3;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.943;
                        MaxBitrate = 600;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.945;
                        MaxBitrate = 600;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.946;
                        MaxBitrate = 650;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.947;
                        MaxBitrate = 700;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.948;
                        MaxBitrate = 700;
                        break;
                    }
            }
        }
        if (DR == '480p' &&  CT == 'Movie') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 3;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.879;
                        MaxBitrate = 900;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.903;
                        MaxBitrate = 900;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.906;
                        MaxBitrate = 900;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.909;
                        MaxBitrate = 1000;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.912;
                        MaxBitrate = 1200;
                        break;
                    }
            }
        }
        if (DR == '480p' &&  CT == 'Documentary') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 3;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.78;
                        MaxBitrate = 500;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.789;
                        MaxBitrate = 600;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.803;
                        MaxBitrate = 700;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.816;
                        MaxBitrate = 800;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.82;
                        MaxBitrate = 1000;
                        break;
                    }
            }
        }
        if (DR == '480p' &&  CT == 'News') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 3;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.879;
                        MaxBitrate = 500;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.882;
                        MaxBitrate = 500;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.885;
                        MaxBitrate = 550;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.887;
                        MaxBitrate = 600;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.889;
                        MaxBitrate = 600;
                        break;
                    }
            }
        }
        if (DR == '480p' &&  CT == 'Sport') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 3;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.836;
                        MaxBitrate = 500;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.84;
                        MaxBitrate = 600;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.851;
                        MaxBitrate = 700;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.859;
                        MaxBitrate = 800;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.863;
                        MaxBitrate = 900;
                        break;
                    }
            }
        }
        if (DR == '360p' &&  CT == 'Animation') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 2;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.894;
                        MaxBitrate = 200;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.9;
                        MaxBitrate = 250;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.916;
                        MaxBitrate = 300;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.927;
                        MaxBitrate = 400;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.939;
                        MaxBitrate = 500;
                        break;
                    }
            }
        }
        if (DR == '360p' &&  CT == 'Movie') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 2;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.84;
                        MaxBitrate = 300;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.842;
                        MaxBitrate = 300;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.85;
                        MaxBitrate = 400;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.86;
                        MaxBitrate = 500;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.87;
                        MaxBitrate = 700;
                        break;
                    }
            }
        }
        if (DR == '360p' &&  CT == 'Documentary') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 2;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.716;
                        MaxBitrate = 250;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.732;
                        MaxBitrate = 250;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.746;
                        MaxBitrate = 300;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.759;
                        MaxBitrate = 400;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.767;
                        MaxBitrate = 400;
                        break;
                    }
            }
        }
        if (DR == '360p' &&  CT == 'News') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 2;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.831;
                        MaxBitrate = 200;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.836;
                        MaxBitrate = 250;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.841;
                        MaxBitrate = 300;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.848;
                        MaxBitrate = 350;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.871;
                        MaxBitrate = 400;
                        break;
                    }
            }
        }
        if (DR == '360p' &&  CT == 'Sport') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 2;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.74;
                        MaxBitrate = 200;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.763;
                        MaxBitrate = 200;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.764;
                        MaxBitrate = 250;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.8;
                        MaxBitrate = 300;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.82;
                        MaxBitrate = 400;
                        break;
                    }
            }
        }
        if (DR == '240p' &&  CT == 'Animation') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 1;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.77;
                        MaxBitrate = 50;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.8;
                        MaxBitrate = 50;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.84;
                        MaxBitrate = 100;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.848;
                        MaxBitrate = 100;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.88;
                        MaxBitrate = 150;
                        break;
                    }
            }
        }
        if (DR == '240p' &&  CT == 'Movie') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 1;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.78;
                        MaxBitrate = 50;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.796;
                        MaxBitrate = 100;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.81;
                        MaxBitrate = 150;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.825;
                        MaxBitrate = 150;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.831;
                        MaxBitrate = 200;
                        break;
                    }
            }
        }
        if (DR == '240p' &&  CT == 'Documentary') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 1;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.63;
                        MaxBitrate = 50;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.652;
                        MaxBitrate = 100;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.671;
                        MaxBitrate = 150;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.682;
                        MaxBitrate = 150;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.687;
                        MaxBitrate = 200;
                        break;
                    }
            }
        }
        if (DR == '240p' &&  CT == 'News') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 1;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.79;
                        MaxBitrate = 50;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.798;
                        MaxBitrate = 50;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.803;
                        MaxBitrate = 100;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.807;
                        MaxBitrate = 100;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.81;
                        MaxBitrate = 150;
                        break;
                    }
            }
        }
        if (DR == '240p' &&  CT == 'Sport') {
            switch(true) {
                case (SPT == 'Normal' || SPT == 'Bronze' || SPT == 'Silver' || SPT == 'Gold' || SPT == 'Platinum'):
                    coalitionID = 1;
                    if (SPT == 'Normal') {
                        SSIMplusQT = 0.67;
                        MaxBitrate = 50;
                        break;
                    }
                    if (SPT == 'Bronze') {
                        SSIMplusQT = 0.69;
                        MaxBitrate = 50;
                        break;
                    }
                    if (SPT == 'Silver') {
                        SSIMplusQT = 0.7;
                        MaxBitrate = 100;
                        break;
                    }
                    if (SPT == 'Gold') {
                        SSIMplusQT = 0.71;
                        MaxBitrate = 100;
                        break;
                    }
                    if (SPT == 'Platinum') {
                        SSIMplusQT = 0.72;
                        MaxBitrate = 150;
                        break;
                    }
            }
        }
        return [coalitionID, SSIMplusQT, MaxBitrate];
    }

    function BWEstimator(type, BWtotal, lastRequest, mediaType, abrController, isDynamic, switchRequest, mediaInfo) {
        switch(true) {
            case (type == 'dash'):
                if (lastRequest.trace && lastRequest.trace.length) {
                    latencyTimeInMilliseconds = (lastRequest.tresponse.getTime() - lastRequest.trequest.getTime()) || 1;
                    downloadTimeInMilliseconds = (lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime()) || 1;
                    const bytes = lastRequest.trace.reduce((a, b) => a + b.b[0], 0);
                    lastRequestThroughput = Math.round((bytes * 8) / (downloadTimeInMilliseconds / 1000));
                    if (isCachedResponse(latencyTimeInMilliseconds, downloadTimeInMilliseconds, mediaType)) {
                        if (!throughputArray[mediaType] || !latencyArray[mediaType]) {
                            AvgBWEstimated = lastRequestThroughput / 1000;
                            latency = latencyTimeInMilliseconds / 1000;
                        } else {
                            AvgBWEstimated = getAverageThroughput(mediaType, isDynamic);
                            latency = getAverageLatency(mediaType);
                        }
                    } else {
                        storeLastRequestThroughputByType(mediaType, lastRequestThroughput);
                        AvgBWEstimated = getAverageThroughput(mediaType, isDynamic);
                        storeLatency(mediaType, latencyTimeInMilliseconds);
                        latency = getAverageLatency(mediaType, isDynamic) / 1000;
                    }
                    abrController.setAverageThroughput(mediaType, AvgBWEstimated);
                    stepbw = Math.round(lastRequestThroughput / 1000);
                }
                switchRequest.value = abrController.getQualityForBitrate(mediaInfo, AvgBWEstimated, latency);
                let BitrateS = getbitratefromindex(switchRequest.value,mediaInfo,abrController); // F
                let playerbwused = BitrateS[0] + BWcross;
                let bwavailible = stepbw - playerbwused; 
                CongestionLevel = playerbwused / bwavailible;
                if (CongestionLevel < 0) {
                    CongestionLevel  = 0;
                }
                let BitrateM = BitrateS[1];
                break;
            case (type == 'Storstatus'):
                let Nstatus = getnetstatus();
                lastRequestThroughput = Nstatus[0];
                AvgBWEstimated = Nstatus[1];
                stepbw = lastRequestThroughput;
                latency = Nstatus[2];
                let BitrateLevelstore = Nstatus[4];
                let playerbwusedstore = BitrateLevelstore + BWcross;
                let bwavailiblestor = lastRequestThroughput - playerbwusedstore;
                CongestionLevel = playerbwusedstore / bwavailiblestor;
                break;
			// To Do 
            case (type == 'PANDA'):  
                break;
            case (type == 'EWMA'): 
                break;
            case (type == 'other'):
                break;
        }
        return [stepbw,AvgBWEstimated,CongestionLevel,latency,BitrateM,BitrateS[0],downloadTimeInMilliseconds / 1000,latencyTimeInMilliseconds];
    }
    // dash.js BW estimation Functions (mean of three last throughput estimations)
    function getbitratefromindex(BitrateIndex, mediaInfo, abrController) {
        let bitratelst = abrController.getBitrateList(mediaInfo);
        let bitrateInfo;
        let bitrateInfoMax;
        for (var i = 0, ln = bitratelst.length; i < ln; i += 1) {
            if (i == BitrateIndex) {
                bitrateInfo = bitratelst[i];
            }
            if (i == ln - 1) {
                bitrateInfoMax = bitratelst[i];
            }
        }
        let rate = (bitrateInfo.bitrate / 1000).toFixed(0);
        let rateMax = (bitrateInfoMax.bitrate / 1000).toFixed(0);
        return [rate,rateMax];
    }

    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        throughputArray[type].push(throughput);
    }

    function storeLatency(mediaType, latency) {
        if (!latencyArray[mediaType]) {
            latencyArray[mediaType] = [];
        }
        latencyArray[mediaType].push(latency);

        if (latencyArray[mediaType].length > AVERAGE_LATENCY_SAMPLES) {
            return latencyArray[mediaType].shift();
        }

        return undefined;
    }

    function getAverageLatency(mediaType) {
        let average;
        if (latencyArray[mediaType] && latencyArray[mediaType].length > 0) {
            average = latencyArray[mediaType].reduce((a, b) => { return a + b; }) / latencyArray[mediaType].length;
        }

        return average;
    }

    function getSample(type, isDynamic) {
        let size = Math.min(throughputArray[type].length, isDynamic ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE : AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD);
        const sampleArray = throughputArray[type].slice(size * -1, throughputArray[type].length);
        if (sampleArray.length > 1) {
            sampleArray.reduce((a, b) => {
                if (a * THROUGHPUT_INCREASE_SCALE <= b || a >= b * THROUGHPUT_DECREASE_SCALE) {
                    size++;
                }
                return b;
            });
        }
        size = Math.min(throughputArray[type].length, size);
        return throughputArray[type].slice(size * -1, throughputArray[type].length);
    }

    function getAverageThroughput(type, isDynamic) {
        const sample = getSample(type, isDynamic);
        let averageThroughput = 0;
        if (sample.length > 0) {
            const totalSampledValue = sample.reduce((a, b) => a + b, 0);
            averageThroughput = totalSampledValue / sample.length;
        }
        if (throughputArray[type].length >= MAX_MEASUREMENTS_TO_KEEP) {
            throughputArray[type].shift();
        }
        return (averageThroughput / 1000 ) * mediaPlayerModel.getBandwidthSafetyFactor();
    }

    function isCachedResponse(latency, downloadTime, mediaType) {
        let ret = false;

        if (latency < CACHE_LOAD_THRESHOLD_LATENCY) {
            ret = true;
        }

        if (!ret) {
            switch (mediaType) {
                case 'video':
                    ret = downloadTime < CACHE_LOAD_THRESHOLD_VIDEO;
                    break;
                case 'audio':
                    ret = downloadTime < CACHE_LOAD_THRESHOLD_AUDIO;
                    break;
                default:
                    break;
            }
        }

        return ret;
    }

    function ComputeUtilityMAX(VideoDuration, QtMax, Bitrateselected, QTselected, step) {
        let Utilitymetrics = getutilitymetrics();
        TotalSSIMplusQT = TotalSSIMplusQT + QtMax;
        AvgSSIMplusQT = TotalSSIMplusQT / step;
        AvgSSIMplusQTSwitch = Math.abs(QtMax - PreviousSSIMplusQT);
        TotalAvgSSIMplusQTSwitch = (TotalAvgSSIMplusQTSwitch + AvgSSIMplusQTSwitch) / (step - 1);
        PreviousSSIMplusQT = QtMax;
        AvgEvtStalls = Utilitymetrics[3] / step;
        AvgEvtStallsDuration = Utilitymetrics[4] / VideoDuration;
        let UtilitySTEPmax =  computeQoE(Utilitymetrics[0],AvgSSIMplusQT,AvgSSIMplusQTSwitch,AvgEvtStalls,AvgEvtStallsDuration);// StartUPDelay, AvgSSIMPlusQuality, AvgSSIMPlusQualitySwitch, 
        if (isNaN(UtilitySTEPmax) || UtilitySTEPmax > 5) {
            UtilitySTEPmax = QtMax * 5;
        }
        return UtilitySTEPmax;
    }

    function actionutilityrelation(action, utility) {
        strategiesOpt.push([action,utility]);
        return strategiesOpt;
    }

    function otheractions(bitrateM, abrController, mediaInfo) { // For NOCoalitionBitrate Usage
        let bitrateInfo;
        actionOthers = [];
        bitratesetOther = abrController.getBitrateList(mediaInfo);
        for (var i = 0, ln = bitratesetOther.length; i < ln; i += 1) {
            bitrateInfo = bitratesetOther[i];
            if ((bitrateInfo.bitrate / 1000).toFixed(0) < parseInt(bitrateM)) {
                let rateother = (bitrateInfo.bitrate / 1000).toFixed(0);
                let SSIMplusqt = bitratequalitymap(rateother,Contenet);
                actionOthers.push([rateother,SSIMplusqt]);
            }
        }
        return [bitratesetOther,actionOthers];
    }

    function ComputeOtherUtilities(VideoDuration, actionsothers, step) {
        let Utilitymetrics = getutilitymetrics();
        for (var i = 0, ln = actionsothers.length; i < ln; i += 1) {
            // AVG Video Quality
            TotalSSIMplusQTOther[i] = TotalSSIMplusQTOther[i] + actionsothers[i][1];
            AvgSSIMplusQTOther[i] = TotalSSIMplusQTOther[i] / step;
            // AVG Video Quality Variation
            AvgSSIMplusQTSwitchOther[i] = Math.abs(actionsothers[i][1] - PreviousSSIMplusQTOther[i]);
            TotalAvgSSIMplusQTSwitchOther[i] = (TotalAvgSSIMplusQTSwitchOther[i] + AvgSSIMplusQTSwitchOther[i]) / (step - 1);
            PreviousSSIMplusQTOther[i] = actionsothers[i][1];
            // Stalls
            AvgEvtStallsOther[i] = Utilitymetrics[3] / step;
            AvgEvtStallsDurationOther[i] = Utilitymetrics[4] / VideoDuration;
            UtilitySTEPOthers[i] =  computeQoE(Utilitymetrics[0],AvgSSIMplusQTOther[i],AvgSSIMplusQTSwitchOther[i],AvgEvtStallsOther[i],AvgEvtStallsDurationOther[i]);
            if (isNaN(UtilitySTEPOthers[i]) || UtilitySTEPOthers[i] > 5 ) {
                UtilitySTEPOthers[i] = actionsothers[i][1] * 5;
            }
        }
        return UtilitySTEPOthers;
    }

    function actionutilityrelationOther(actions, utilities) {
        strategiesOther.push([actions,utilities]);
        return strategiesOther;
    }

    function getBargainingPower(Type, Cplayer) {
        switch (true) {
            case (Type == 'EF'):
                alphaPower = 1 / Cplayer; 
                break;
            case (Type == 'SVF'):
                // TO DO
                break;
            case (Type == 'PF'):
                // TO DO
                break;
            case (Type == 'MMF'):
                // TO DO
                break;
            case (Type == 'Random'):
                alphaPower =  Math.floor((Math.random() * (1 / Cplayer)) + 0);
                break;
        }
        return alphaPower;
    }

    function ComputeBargainingOutcome(BitrateM, QtM, StepUtilityM, actionO, StepUtilityO, alpha) { // Before strategyM, strategyO, alphaPower
        for (var i = 0, ln = actionO.length; i < ln; i += 1) {
            OutcomeResultBitrate[i] = Math.pow((BitrateM - parseInt(actionO[i][0])),alpha);
            OutcomeResultQuality[i] = Math.pow((QtM - actionO[i][1]),alpha);
            OutcomeResultUtility[i] = Math.pow((StepUtilityM - StepUtilityO[i]),alpha);
        }
        let OutcomeResultBitrateMAX = Math.min.apply(Math,OutcomeResultBitrate);
        let OutcomeResultBitrateMAXIndex =  OutcomeResultBitrate.indexOf(OutcomeResultBitrateMAX);
        let OutcomeResultQualityMAX = Math.min.apply(Math,OutcomeResultQuality);
        let OutcomeResultQualityMAXIndex =  OutcomeResultQuality.indexOf(OutcomeResultQualityMAX);
        let OutcomeResultUtilityMAX = Math.min.apply(Math,OutcomeResultUtility);
        let OutcomeResultUtilityMAXIndex =  OutcomeResultUtility.indexOf(OutcomeResultUtilityMAX);
        // Make sure that all Indexes are equall to ensure the right mapping function F
        BOutcome.push([OutcomeResultBitrate,OutcomeResultQuality,OutcomeResultUtility]);
        BOutcomeMAX.push([OutcomeResultBitrateMAX,OutcomeResultQualityMAX,OutcomeResultUtilityMAX,OutcomeResultBitrateMAXIndex,OutcomeResultQualityMAXIndex,OutcomeResultUtilityMAXIndex]);
        return [BOutcome,BOutcomeMAX];
    }

    function storbargainingoutcomeall(BOall) {
        BargainingOutcomeALL.push(BOall);
        return BargainingOutcomeALL;
    }

    function storbargainingoutcomeopt(BOopt) {
        BargainingOutcomeOpt.push(BOopt);
        return BargainingOutcomeOpt;
    }

	function getBitrateIndex (rate, abrController, mediaInfo) {
        let bitrateInfo;
        let ratelist = abrController.getBitrateList(mediaInfo);
        var index;
        for (var i = 0, ln = ratelist.length; i < ln; i += 1) {
            bitrateInfo = ratelist[i];
            if ((bitrateInfo.bitrate / 1000).toFixed(0) <= rate) {
                index = i;
            }
        }
        return index;
    }

    function getNewBitrateList (MediaInfo, abrController, rate) {
        let bitrateInfo;
        let BitrateNewList = [];
        let ratelist = abrController.getBitrateList(MediaInfo);
        for (var i = 0, ln = ratelist.length; i < ln; i += 1) {
            bitrateInfo = ratelist[i];
            if ((bitrateInfo.bitrate / 1000).toFixed(0) <= parseInt(rate)) { // <
                BitrateNewList.push((bitrateInfo.bitrate / 1000).toFixed(0)); // Stored in bps
            }
        }
        return BitrateNewList;
    }

    function DecisionEstimationLearningPip(actionsOth, BO, CoalitionPlayersNbr, AvailibleBW, Bitratelst, BitrateSel, qtMax, switchReq, abrController, mediaInfo, ActionsOTH, StepUtilityMAX, actionM, videoduration, step, UtilitymetricsStor, StepUtilityMAXStor, strategyMaxSet, StepUtilityOTH, StepUtilityOTHStor, strategyOtherSet, alphaP, BargainingOutcomeAllSet, BargainingOutcomeOptSet, latanc) {
        let PrefshairBWCl = BitrateSel * NCl;
        let BWsliceMAX = Cl[2];
        let newBitrateMaxIndex = switchReq.value;
        let newBitrate = BitrateSel;
        let newActionsOTH = ActionsOTH;
        let newactionsOth = actionsOth;
        let newQtMax = qtMax;
        let newStepUtilityMAX = StepUtilityMAX;
        let newBitratelst = Bitratelst;
        let newactionMAX = actionM;
        let newUtilitymetricsStor = UtilitymetricsStor;
        let newStepUtilityMAXStor = StepUtilityMAXStor;
        let newstrategyMaxSet = strategyMaxSet;
        let newBargainingOutcome = BO;
        let newStepUtilityOTH = StepUtilityOTH;
        let newStepUtilityOTHStor = StepUtilityOTHStor;
        let newstrategyOtherSet = strategyOtherSet;
        let newBargainingOutcomeAllSet = BargainingOutcomeAllSet;
        let newBargainingOutcomeOptSet = BargainingOutcomeOptSet;
        let LocalObjfBitrate = [];
        let LocalObjfSSIMplus = [];
        let LocalObjFunction = [];
        let LocalObjfBitrateOpt = 0;
        let LocalObjfBitrateOptIndex = 0;
        let LocalObjfSSIMplusOpt = 0;
        let LocalObjfSSIMplusOptIndex = 0;
        let LocalObjFunctionOpt = [];
        let newPrefshairBWCl = 0;
        let newRemainBWpref = 0;
        let TotalLocalObjfBitrateOpt = 0;
        let TotalLocalObjfSSIMplusOpt = 0;
        let TotalLocalPotfBitrateOpt = 0;
        let TotalLocalPotfBitrateOptFinal = 0;
        let TotalLocalPotfSSIMplusOpt = 0;
        let TotalLocalPotfSSIMplusOptFinal = 0;
        let TotalLocalObjPotf = [];
        let ConsensusUpdatingBitrateNext = 0;
        let ConsensusUpdatingSSIMplusNext = 0;
        let TotalConsSSIMplus = 0;
        let TotalConsBitrate = 0;
        let ConsensusUpdatingRule = [];
        let NEWVaribles = [];
        let UpdatingVar = [];
        let switchRequest = switchReq;
        let LocalObjfBitrateOptValue = 0;
        let LocalObjfSSIMplusOptValue = 0;
		
        if (BitrateSel > AvailibleBW) {
            newBitrateMaxIndex = abrController.getQualityForBitrate(mediaInfo, AvailibleBW, latanc);
            newBitrate = parseInt(Bitratelst[newBitrateMaxIndex]);
            if (newBitrate > BWsliceMAX) {
                newBitrateMaxIndex = abrController.getQualityForBitrate(mediaInfo, BWsliceMAX, latanc);
                let select = getbitratefromindex(newBitrateMaxIndex+1,mediaInfo,abrController);
                newBitrate = parseInt(select[0]);
            }
            BitrateSel = newBitrate;
        }
        if (newBitrateMaxIndex !== switchRequest.value) {
            switchRequest = SwitchRequest(context).create(newBitrateMaxIndex, SwitchRequest.STRONG);
            newQtMax = bitratequalitymap(newBitrate,Contenet);
            newactionMAX = [];
            if (newactionMAX.length === 0) {
                newactionMAX.push([newBitrate,newQtMax]);
            }
            newBitratelst = getNewBitrateList(mediaInfo,abrController,newBitrate);
            newStepUtilityMAX = ComputeUtilityMAX(videoduration,newQtMax,newBitrate,newQtMax,step);
            newUtilitymetricsStor = getutilitymetrics();
            newStepUtilityMAXStor = computeQoE(newUtilitymetricsStor[0],newQtMax,newUtilitymetricsStor[2],newUtilitymetricsStor[3]/step,newUtilitymetricsStor[4]/videoduration);
            if (isNaN(newStepUtilityMAXStor) || newStepUtilityMAXStor > 5) {
                newStepUtilityMAXStor = newQtMax * 5;
            }
            newstrategyMaxSet = actionutilityrelation(newactionMAX,newStepUtilityMAX);
            newActionsOTH = otheractions(newBitrate,abrController,mediaInfo);
            newactionsOth = newActionsOTH[1];
            newStepUtilityOTH = ComputeOtherUtilities(videoduration,newactionsOth,step);
            for (var k = 0, lk = newactionsOth.length; k < lk; k += 1) {
                newStepUtilityOTHStor[k] = computeQoE(newUtilitymetricsStor[0],newactionsOth[k][1],newUtilitymetricsStor[2],newUtilitymetricsStor[3]/step,newUtilitymetricsStor[4]/videoduration);
                if (isNaN(newStepUtilityOTHStor[k])) {
                    newStepUtilityOTHStor[k] = newactionsOth[k][1] * 5;
                }
            }
            newstrategyOtherSet = actionutilityrelationOther(newactionsOth,newStepUtilityOTH);
            newBargainingOutcome = ComputeBargainingOutcome(newBitrate,newQtMax,newStepUtilityMAX,newactionsOth,newStepUtilityOTH,alphaP);
            newBargainingOutcomeAllSet = storbargainingoutcomeall(newBargainingOutcome[0]);
            newBargainingOutcomeOptSet = storbargainingoutcomeopt(newBargainingOutcome[1]);
            NEWVaribles.push([switchRequest,newQtMax,newactionMAX,newBitratelst,newStepUtilityMAX,newUtilitymetricsStor,newStepUtilityMAXStor,newstrategyMaxSet,newActionsOTH,newactionsOth,newStepUtilityOTH,newStepUtilityOTHStor,newstrategyOtherSet,newBargainingOutcome,newBargainingOutcomeAllSet,newBargainingOutcomeOptSet]);
            // Now Compute Potontial function /Phi and local objective funtion f -> with the Objective is to minimize f
            for (var i = 0, ln = actionsOth.length; i < ln; i += 1) {
                LocalObjfBitrate[i] = Math.abs(newBitrate - actionsOth[i][0]);
                LocalObjfSSIMplus[i] = Math.abs(newQtMax - actionsOth[i][1]);
            }
            LocalObjFunction.push([LocalObjfBitrate,LocalObjfSSIMplus]);
            LocalObjfBitrateOpt = Math.min.apply(Math,LocalObjfBitrate);
            LocalObjfBitrateOptIndex = LocalObjfBitrate.indexOf(LocalObjfBitrateOpt);
            LocalObjfBitrateOptValue = parseInt(Bitratelst[LocalObjfBitrateOptIndex]);
            LocalObjfSSIMplusOpt = Math.min.apply(Math,LocalObjfSSIMplus);
            LocalObjfSSIMplusOptIndex = LocalObjfSSIMplus.indexOf(LocalObjfSSIMplusOpt);
            LocalObjfSSIMplusOptValue = bitratequalitymap(LocalObjfBitrateOptValue,Contenet);
            LocalObjFunctionOpt.push([LocalObjfBitrateOpt,LocalObjfBitrateOptIndex,LocalObjfBitrateOptValue,LocalObjfSSIMplusOpt,LocalObjfSSIMplusOptIndex,LocalObjfSSIMplusOptValue]);

            // compute local objective function sum ||bitratepk - bitratep{k}||
            for (var j = 0, lj = NCl-1; j < lj; j += 1) {
                TotalLocalObjfBitrateOpt = TotalLocalObjfBitrateOpt + Math.abs(newBitrate - LocalObjfBitrateOptValue);
                TotalLocalObjfSSIMplusOpt = TotalLocalObjfSSIMplusOpt + Math.abs(newQtMax - LocalObjfSSIMplusOptValue);
            }

            // compute potontial function
            for (var l = 0, ll = NCl-1; l < ll; l += 1) {
                TotalLocalPotfBitrateOpt = TotalLocalPotfBitrateOpt + Math.abs(newBitrate - LocalObjfBitrateOptValue) / 2;
                TotalLocalPotfSSIMplusOpt = TotalLocalPotfSSIMplusOpt + Math.abs(newQtMax - LocalObjfSSIMplusOptValue) / 2;
            }

            for (var r = 0, rr = NCl; r < rr; r += 1) {
                TotalLocalPotfBitrateOptFinal = TotalLocalPotfBitrateOptFinal + TotalLocalPotfBitrateOpt;
                TotalLocalPotfSSIMplusOptFinal = TotalLocalPotfSSIMplusOptFinal + TotalLocalPotfSSIMplusOpt;
            }
            TotalLocalObjPotf.push([TotalLocalObjfBitrateOpt,TotalLocalObjfSSIMplusOpt,TotalLocalPotfBitrateOptFinal,TotalLocalPotfSSIMplusOptFinal]);
            // updating rule Consensus based on LocalObjfBitrateOpt
            for (var z = 0, zz = NCl-1; z < zz; z += 1) {
                TotalConsBitrate = TotalConsBitrate + (alphaP * (Math.abs(newBitrate - LocalObjfBitrateOptValue)));
                TotalConsSSIMplus = TotalConsSSIMplus + (alphaP * (Math.abs(newQtMax - LocalObjfSSIMplusOptValue)));
            }
            ConsensusUpdatingBitrateNext = newBitrate + TotalConsBitrate;
            ConsensusUpdatingSSIMplusNext = newQtMax + TotalConsSSIMplus;
            ConsensusUpdatingRule.push([ConsensusUpdatingBitrateNext,ConsensusUpdatingSSIMplusNext]); // this used in decisions for next bitrate/qt in maximizing fusion

            // Double Check Function
            newPrefshairBWCl = LocalObjfBitrateOptValue * NCl;
            newRemainBWpref = BWtotal - BWcross - newPrefshairBWCl;
            if (LocalObjfBitrateOptValue > AvailibleBW) {
				// All this are for CSV logging
                let newRequirement =  DecisionEstimationLearningPipLevel2(NEWVaribles[0], LocalObjfBitrateOptValue, AvailibleBW, NCl, mediaInfo,abrController,videoduration, step,alphaP, false,BWsliceMAX, latanc);
                switchRequest = newRequirement[0];
                newQtMax = newRequirement[1];
                newactionMAX = newRequirement[2];
                newBitratelst = newRequirement[3];
                newStepUtilityMAX = newRequirement[4];
                newUtilitymetricsStor = newRequirement[5];
                newStepUtilityMAXStor = newRequirement[6];
                newstrategyMaxSet = newRequirement[7];
                newActionsOTH = newRequirement[8];
                newactionsOth = newRequirement[9];
                newStepUtilityOTH = newRequirement[10];
                newStepUtilityOTHStor = newRequirement[11];
                newstrategyOtherSet = newRequirement[12];
                newBargainingOutcome = newRequirement[13];
                newBargainingOutcomeAllSet = newRequirement[14];
                newBargainingOutcomeOptSet = newRequirement[15];
                LocalObjFunction = newRequirement[16];
                LocalObjfBitrate = LocalObjFunction[0][0];
                LocalObjfSSIMplus = LocalObjFunction[0][1];
                LocalObjFunctionOpt = newRequirement[17];
                LocalObjfBitrateOpt = LocalObjFunctionOpt[0][0];
                LocalObjfBitrateOptIndex = LocalObjFunctionOpt[0][1];
                LocalObjfBitrateOptValue = parseInt(LocalObjFunctionOpt[0][2]);
                LocalObjfSSIMplusOpt = LocalObjFunctionOpt[0][3];
                LocalObjfSSIMplusOptIndex = LocalObjFunctionOpt[0][4];
                LocalObjfSSIMplusOptValue = LocalObjFunctionOpt[0][5];
                TotalLocalObjPotf = newRequirement[18];
                TotalLocalObjfBitrateOpt = TotalLocalObjPotf[0][0];
                TotalLocalObjfSSIMplusOpt = TotalLocalObjPotf[0][1];
                TotalLocalPotfBitrateOptFinal = TotalLocalObjPotf[0][2];
                TotalLocalPotfSSIMplusOptFinal = TotalLocalObjPotf[0][3];
                ConsensusUpdatingRule = newRequirement[19];
                ConsensusUpdatingBitrateNext = ConsensusUpdatingRule[0][0];
                ConsensusUpdatingSSIMplusNext = ConsensusUpdatingRule[0][1];
            }
            else {
                let newIndex = getBitrateIndex(LocalObjfBitrateOptValue, abrController, mediaInfo);
                if (parseInt(LocalObjfBitrateOptValue) > BWsliceMAX) {
                    newIndex = abrController.getQualityForBitrate(mediaInfo, BWsliceMAX, latanc);
                    let select2 = getbitratefromindex(newIndex+1,mediaInfo,abrController);
                    LocalObjfBitrateOptValue = parseInt(select2[0]);
                }
                if (newIndex !== switchRequest.value) {
                    UpdatingVar = DecisionEstimationLearningPipLevel2(NEWVaribles[0],LocalObjfBitrateOptValue,AvailibleBW,NCl,mediaInfo,abrController,videoduration,step,alphaP,newIndex,BWsliceMAX,latanc);
                    switchRequest = UpdatingVar[0];
                    newQtMax = UpdatingVar[1];
                    newactionMAX = UpdatingVar[2];
                    newBitratelst = UpdatingVar[3];
                    newStepUtilityMAX = UpdatingVar[4];
                    newUtilitymetricsStor = UpdatingVar[5];
                    newStepUtilityMAXStor = UpdatingVar[6];
                    newstrategyMaxSet = UpdatingVar[7];
                    newActionsOTH = UpdatingVar[8];
                    newactionsOth = UpdatingVar[9];
                    newStepUtilityOTH = UpdatingVar[10];
                    newStepUtilityOTHStor = UpdatingVar[11];
                    newstrategyOtherSet = UpdatingVar[12];
                    newBargainingOutcome = UpdatingVar[13];
                    newBargainingOutcomeAllSet = UpdatingVar[14];
                    newBargainingOutcomeOptSet = UpdatingVar[15];
                    LocalObjFunction = UpdatingVar[16];
                    LocalObjfBitrate = LocalObjFunction[0][0];
                    LocalObjfSSIMplus = LocalObjFunction[0][1];
                    LocalObjFunctionOpt = UpdatingVar[17];
                    LocalObjfBitrateOpt = LocalObjFunctionOpt[0][0];
                    LocalObjfBitrateOptIndex = LocalObjFunctionOpt[0][1];
                    LocalObjfBitrateOptValue = parseInt(LocalObjFunctionOpt[0][2]);
                    LocalObjfSSIMplusOpt = LocalObjFunctionOpt[0][3];
                    LocalObjfSSIMplusOptIndex = LocalObjFunctionOpt[0][4];
                    LocalObjfSSIMplusOptValue = LocalObjFunctionOpt[0][5];
                    TotalLocalObjPotf = UpdatingVar[18];
                    TotalLocalObjfBitrateOpt = TotalLocalObjPotf[0][0];
                    TotalLocalObjfSSIMplusOpt = TotalLocalObjPotf[0][1];
                    TotalLocalPotfBitrateOptFinal = TotalLocalObjPotf[0][2];
                    TotalLocalPotfSSIMplusOptFinal = TotalLocalObjPotf[0][3];
                    ConsensusUpdatingRule = UpdatingVar[19];
                    ConsensusUpdatingBitrateNext = ConsensusUpdatingRule[0][0];
                    ConsensusUpdatingSSIMplusNext = ConsensusUpdatingRule[0][1];
                }
            }
        }
        else {
            // Now Compute Potontial function /Phi and local objective funtion f -> with the Objective is to minimize f
            for ( var ii = 0, lni = actionsOth.length; ii < lni; ii += 1) {
                LocalObjfBitrate[ii] = Math.abs(newBitrate - actionsOth[ii][0]);
                LocalObjfSSIMplus[ii] = Math.abs(newQtMax - actionsOth[ii][1]);
            }
            LocalObjFunction.push([LocalObjfBitrate,LocalObjfSSIMplus]);
            LocalObjfBitrateOpt = Math.min.apply(Math,LocalObjfBitrate);
            LocalObjfBitrateOptIndex = LocalObjfBitrate.indexOf(LocalObjfBitrateOpt);
            LocalObjfBitrateOptValue = parseInt(Bitratelst[LocalObjfBitrateOptIndex]);
            LocalObjfSSIMplusOpt = Math.min.apply(Math,LocalObjfSSIMplus);
            LocalObjfSSIMplusOptIndex = LocalObjfSSIMplus.indexOf(LocalObjfSSIMplusOpt);
            LocalObjfSSIMplusOptValue = bitratequalitymap(LocalObjfBitrateOptValue,Contenet);
            LocalObjFunctionOpt.push([LocalObjfBitrateOpt,LocalObjfBitrateOptIndex,LocalObjfBitrateOptValue,LocalObjfSSIMplusOpt,LocalObjfSSIMplusOptIndex,LocalObjfSSIMplusOptValue]);

            // compute local objective function sum ||bitratepk - bitratep{k}||
            for (var jj = 0, ljj = NCl-1; jj < ljj; jj += 1) {
                TotalLocalObjfBitrateOpt = TotalLocalObjfBitrateOpt + Math.abs(newBitrate - LocalObjfBitrateOptValue); 
                TotalLocalObjfSSIMplusOpt = TotalLocalObjfSSIMplusOpt + Math.abs(newQtMax - LocalObjfSSIMplusOptValue);
            }

            // compute potontial function
            for (var lli = 0, llli = NCl-1; lli < llli; lli+= 1) {
                TotalLocalPotfBitrateOpt = TotalLocalPotfBitrateOpt + Math.abs(newBitrate - LocalObjfBitrateOptValue) / 2;
                TotalLocalPotfSSIMplusOpt = TotalLocalPotfSSIMplusOpt + Math.abs(newQtMax - LocalObjfSSIMplusOptValue) / 2;
            }

            for (var rri = 0, rrri = NCl; rri < rrri; rri += 1) {
                TotalLocalPotfBitrateOptFinal = TotalLocalPotfBitrateOptFinal + TotalLocalPotfBitrateOpt;
                TotalLocalPotfSSIMplusOptFinal = TotalLocalPotfSSIMplusOptFinal + TotalLocalPotfSSIMplusOpt;
            }
            TotalLocalObjPotf.push([TotalLocalObjfBitrateOpt,TotalLocalObjfSSIMplusOpt,TotalLocalPotfBitrateOptFinal,TotalLocalPotfSSIMplusOptFinal]); // Should be used during Optimization function
            // updating rule Consensus based on LocalObjfBitrateOpt
            for (var zzi = 0, zzzi = NCl-1; zzi < zzzi; zzi += 1) {
                TotalConsBitrate = TotalConsBitrate + (alphaP * (Math.abs(newBitrate - LocalObjfBitrateOptValue)));
                TotalConsSSIMplus = TotalConsSSIMplus + (alphaP * (Math.abs(newQtMax - LocalObjfSSIMplusOptValue)));
            }
            ConsensusUpdatingBitrateNext = newBitrate + TotalConsBitrate;
            ConsensusUpdatingSSIMplusNext = newQtMax + TotalConsSSIMplus;
            ConsensusUpdatingRule.push([ConsensusUpdatingBitrateNext,ConsensusUpdatingSSIMplusNext]); // this used in decisions for next bitrate/qt in maximizing fusion
        }

        return[switchRequest,newQtMax,newactionMAX,newBitratelst,newStepUtilityMAX,newUtilitymetricsStor,newStepUtilityMAXStor,newstrategyMaxSet,newActionsOTH,newactionsOth,newStepUtilityOTH,newStepUtilityOTHStor,newstrategyOtherSet,newBargainingOutcome,newBargainingOutcomeAllSet,newBargainingOutcomeOptSet,LocalObjFunction,LocalObjFunctionOpt,TotalLocalObjPotf,ConsensusUpdatingRule];
    }

    function DecisionEstimationLearningPipLevel2(Vars, BWClReq, Avbw, NCl, mediaInfo, abrController, videoduration, step, alphaP, Index, BWsliceMAX, latanc) {
        let switchRequest = Vars[0];
        let newnewQtMax = Vars[1];
        let newnewactionMAX = [];
        let newnewBitratelst = getNewBitrateList(mediaInfo,abrController,BWsliceMAX);
		/* Vars for CSV logging and baypass chrome sec*/
        let newnewStepUtilityMAX = 0; 
        let newnewUtilitymetricsStor = [];
        let newnewStepUtilityMAXStor = 0; 
        let newnewstrategyMaxSet = [];
        let newnewActionsOTH = [];
        let newnewactionsOth = [];
        let newnewStepUtilityOTH = [];
        let newnewStepUtilityOTHStor =   [];
        let newnewstrategyOtherSet = [];
        let newnewBargainingOutcome = [];
        let newnewBargainingOutcomeAllSet = [];
        let newnewBargainingOutcomeOptSet = [];
        let newnewBitrateMaxIndex = switchRequest.value;
        let newnewBitrate = newnewBitratelst[switchRequest.value];
        let newLocalObjfBitrate = [];
        let newLocalObjfSSIMplus = [];
        let newLocalObjFunction = [];
        let newLocalObjfBitrateOpt = 0;
        let newLocalObjfBitrateOptIndex = 0;
        let newLocalObjfSSIMplusOpt = 0;
        let newLocalObjfSSIMplusOptIndex = 0;
        let newLocalObjFunctionOpt = [];
        let newTotalLocalObjfBitrateOpt = 0;
        let newTotalLocalObjfSSIMplusOpt = 0;
        let newTotalLocalPotfBitrateOpt = 0;
        let newTotalLocalObjPotf = [];
        let newTotalConsBitrate = 0;
        let newTotalConsSSIMplus = 0;
        let newConsensusUpdatingBitrateNext = 0;
        let newConsensusUpdatingSSIMplusNext = 0;
        let newConsensusUpdatingRule = [];
        let newLocalObjfBitrateOptValue = 0;
        let newLocalObjfSSIMplusOptValue = 0;
        let newTotalLocalPotfBitrateOptFinal = 0;
        let newTotalLocalPotfSSIMplusOpt = 0;
        let newTotalLocalPotfSSIMplusOptFinal = 0;

        if (Index === false) {
            if (BWClReq > Avbw) { 
                newnewBitrateMaxIndex = abrController.getQualityForBitrate(mediaInfo, Avbw, latanc);
                newnewBitrate = newnewBitratelst[newnewBitrateMaxIndex];
                if (newnewBitrate > BWsliceMAX) {
                    newnewBitrateMaxIndex = abrController.getQualityForBitrate(mediaInfo, BWsliceMAX, latanc);
                    let select = getbitratefromindex(newnewBitrateMaxIndex+1,mediaInfo,abrController);
                    newnewBitrate = parseInt(select[0]);
                }
                BWClReq = newnewBitrate;
            }
            switchRequest = SwitchRequest(context).create(newnewBitrateMaxIndex, SwitchRequest.STRONG);
        }
        else {
            newnewBitrateMaxIndex = Index;
            let select = getbitratefromindex(Index,mediaInfo,abrController);
            newnewBitrate = parseInt(select[0]);
            if (newnewBitrate > BWsliceMAX) {
                newnewBitrateMaxIndex = abrController.getQualityForBitrate(mediaInfo, BWsliceMAX, latanc);
                let select2 = getbitratefromindex(newnewBitrateMaxIndex+1,mediaInfo,abrController);
                newnewBitrate = parseInt(select2[0]);
            }
            switchRequest = SwitchRequest(context).create(newnewBitrateMaxIndex, SwitchRequest.STRONG);
        }

        newnewQtMax = bitratequalitymap(newnewBitrate,Contenet);
        newnewactionMAX = [];
        if (newnewactionMAX.length === 0) {
            newnewactionMAX.push([newnewBitrate,newnewQtMax]);
        }
        newnewBitratelst = getNewBitrateList(mediaInfo,abrController,newnewBitrate);
        newnewStepUtilityMAX = ComputeUtilityMAX(videoduration,newnewQtMax,newnewBitrate,newnewQtMax,step);
        newnewUtilitymetricsStor = getutilitymetrics();
        newnewStepUtilityMAXStor = computeQoE(newnewUtilitymetricsStor[0],newnewQtMax,newnewUtilitymetricsStor[2],newnewUtilitymetricsStor[3]/step,newnewUtilitymetricsStor[4]/videoduration);
        if (isNaN(newnewStepUtilityMAXStor) || newnewStepUtilityMAXStor > 5) {
            newnewStepUtilityMAXStor = newnewQtMax * 5;
        }
        newnewstrategyMaxSet = actionutilityrelation(newnewactionMAX,newnewStepUtilityMAX);
        newnewActionsOTH = otheractions(newnewBitrate,abrController,mediaInfo);
        newnewactionsOth = newnewActionsOTH[1];
        newnewStepUtilityOTH = ComputeOtherUtilities(videoduration,newnewactionsOth,step);
        for (var k = 0, lk = newnewactionsOth.length; k < lk; k += 1) {
            newnewStepUtilityOTHStor[k] = computeQoE(newnewUtilitymetricsStor[0],newnewactionsOth[k][1],newnewUtilitymetricsStor[2],newnewUtilitymetricsStor[3]/step,newnewUtilitymetricsStor[4]/videoduration);
            if (isNaN(newnewStepUtilityOTHStor[k]) || newnewStepUtilityOTHStor[k] > 5) {
                newnewStepUtilityOTHStor[k] = newnewactionsOth[k][1] * 5;
            }
        }
        newnewstrategyOtherSet = actionutilityrelationOther(newnewactionsOth,newnewStepUtilityOTH);
        newnewBargainingOutcome = ComputeBargainingOutcome(newnewBitrate,newnewQtMax,newnewStepUtilityMAX,newnewactionsOth,newnewStepUtilityOTH,alphaP);
        newnewBargainingOutcomeAllSet = storbargainingoutcomeall(newnewBargainingOutcome[0]);
        newnewBargainingOutcomeOptSet = storbargainingoutcomeopt(newnewBargainingOutcome[1]);

        // Now Compute Potontial function /Phi and local objective funtion f -> with the Objective is to minimize f
        for (var i = 0, ln = Vars[9].length; i < ln; i += 1) {
            newLocalObjfBitrate[i] = Math.abs(newnewBitrate - Vars[9][i][0]); 
            newLocalObjfSSIMplus[i] = Math.abs(newnewQtMax - Vars[9][i][1]);
        }
        newLocalObjFunction.push([newLocalObjfBitrate,newLocalObjfSSIMplus]);
        newLocalObjfBitrateOpt = Math.min.apply(Math,newLocalObjfBitrate);
        newLocalObjfBitrateOptIndex = newLocalObjfBitrate.indexOf(newLocalObjfBitrateOpt);
        newLocalObjfBitrateOptValue = parseInt(newnewBitratelst[newLocalObjfBitrateOptIndex]);
        newLocalObjfSSIMplusOpt = Math.min.apply(Math,newLocalObjfSSIMplus);
        newLocalObjfSSIMplusOptIndex = newLocalObjfSSIMplus.indexOf(newLocalObjfSSIMplusOpt);
        newLocalObjfSSIMplusOptValue = bitratequalitymap(newLocalObjfBitrateOptValue,Contenet);
        newLocalObjFunctionOpt.push([newLocalObjfBitrateOpt,newLocalObjfBitrateOptIndex,newLocalObjfBitrateOptValue,newLocalObjfSSIMplusOpt,newLocalObjfSSIMplusOptIndex,newLocalObjfSSIMplusOptValue]);

        // compute local objective function sum ||bitratepk - bitratep{k}||
        for (var j = 0, lj = NCl-1; j < lj; j += 1) {
            newTotalLocalObjfBitrateOpt = newTotalLocalObjfBitrateOpt + Math.abs(newnewBitrate - newLocalObjfBitrateOptValue);
            newTotalLocalObjfSSIMplusOpt = newTotalLocalObjfSSIMplusOpt + Math.abs(newnewQtMax - newLocalObjfSSIMplusOptValue);
        }

        // compute potontial function
        for (var l = 0, ll = NCl-1; l < ll; l += 1) {
            newTotalLocalPotfBitrateOpt = newTotalLocalPotfBitrateOpt + Math.abs(newnewBitrate - newLocalObjfBitrateOptValue) / 2;
            newTotalLocalPotfSSIMplusOpt = newTotalLocalPotfSSIMplusOpt + Math.abs(newnewQtMax - newLocalObjfSSIMplusOptValue) / 2;
        }

        for (var r = 0, rr = NCl; r < rr; r += 1) {
            newTotalLocalPotfBitrateOptFinal = newTotalLocalPotfBitrateOptFinal + newTotalLocalPotfBitrateOpt;
            newTotalLocalPotfSSIMplusOptFinal = newTotalLocalPotfSSIMplusOptFinal + newTotalLocalPotfSSIMplusOpt;
        }
        newTotalLocalObjPotf.push([newTotalLocalObjfBitrateOpt,newTotalLocalObjfSSIMplusOpt,newTotalLocalPotfBitrateOptFinal,newTotalLocalPotfSSIMplusOptFinal]);
        // updating rule Consensus based on LocalObjfBitrateOpt
        for (var z = 0, zz = NCl-1; z < zz; z += 1) {
            newTotalConsBitrate = newTotalConsBitrate + (alphaP * (Math.abs(newnewBitrate - newLocalObjfBitrateOptValue)));
            newTotalConsSSIMplus = newTotalConsSSIMplus + (alphaP * (Math.abs(newnewQtMax - newLocalObjfSSIMplusOptValue)));
        }
        newConsensusUpdatingBitrateNext = newnewBitrate + newTotalConsBitrate;
        newConsensusUpdatingSSIMplusNext = newnewQtMax + newTotalConsSSIMplus;
        newConsensusUpdatingRule.push([newConsensusUpdatingBitrateNext,newConsensusUpdatingSSIMplusNext]);
		return[switchRequest,newnewQtMax,newnewactionMAX,newnewBitratelst,newnewStepUtilityMAX,newnewUtilitymetricsStor,newnewStepUtilityMAXStor,newnewstrategyMaxSet,newnewActionsOTH,newnewactionsOth,newnewStepUtilityOTH,newnewStepUtilityOTHStor,newnewstrategyOtherSet,newnewBargainingOutcome,newnewBargainingOutcomeAllSet,newnewBargainingOutcomeOptSet,newLocalObjFunction,newLocalObjFunctionOpt,newTotalLocalObjPotf,newConsensusUpdatingRule];
    }

    // Buffer Constraint function
    function setBufferInfo(type, state) {
        bufferStateDict[type] = bufferStateDict[type] || {};
        bufferStateDict[type].state = state;
        if (state === BufferController.BUFFER_LOADED && !bufferStateDict[type].firstBufferLoadedEvent) {
            bufferStateDict[type].firstBufferLoadedEvent = true;
        }
    }

    // Chunk Download time and congestion level Constraint function
    function setFragmentRequestDict(type, id) {
        fragmentDict[type] = fragmentDict[type] || {};
        fragmentDict[type][id] = fragmentDict[type][id] || {};
    }
    function storeLastRequestThroughputByTypeV2(type, throughput) {
        throughputArrayV2[type] = throughputArrayV2[type] || [];
        throughputArrayV2[type].push(throughput);
    }

    /////////////////////////////////////////////////////////////////////////////////
    function getMaxIndex(rulesContext) {
        // Bitrate Adaptation Algo
        let request = getFragmentinfo();
        let switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, {name: GTA.__dashjs_factory_name});
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = mediaInfo.type;
        const metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        const streamProcessor = rulesContext.getStreamProcessor();
        streamProcessor.getScheduleController().setTimeToLoadDelay(0);
        let current = rulesContext.getCurrentValue();
        const abrController = streamProcessor.getABRController();
        const isDynamic = streamProcessor.isDynamic();
        let time = adapter.getIndexHandlerTime(rulesContext.getStreamProcessor()).toFixed(3);
        let streamInfo = rulesContext.getStreamInfo();
        let lastRequest = dashMetrics.getCurrentHttpRequest(metrics);
        let CurrentbufferLevel = dashMetrics.getCurrentBufferLevel(metrics) ? dashMetrics.getCurrentBufferLevel(metrics) : 0.0;
        const bufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null;
        const hasRichBuffer = rulesContext.hasRichBuffer();
        let MinBuff = BUFFER_MIN_GTA;
        let MaxBuff = BUFFER_MAX_GTA;
        let LogInfo = [];
		
        if (!metrics || !lastRequest || lastRequest.type !== HTTPRequest.MEDIA_SEGMENT_TYPE || !bufferStateVO || hasRichBuffer) {
            return switchRequest;
        }

        switch (true) {
            case (Algorithm == 'CoalitionBitrate'):
                // TO DO
                break;
            case (Algorithm == 'Without'):
                // TO DO this without any coialition rule just use all bitrate list for all type of players beloning to different coialition
                break;
            case (Algorithm == 'NOCoalitionBitrate'):
                /* 1. Compute Network Status (BW,Congestion Level) */
                netwrokstatus = BWEstimator(BWeType[2],BWtotal,lastRequest,mediaType,abrController,isDynamic,switchRequest,mediaInfo,BitrateSelected);
                let BitrateMAX = netwrokstatus[4];
                BitrateSelected = getbitratefromindex(switchRequest.value,mediaInfo,abrController);
                if (BitrateMAX > Cl[2]) {
                    BitrateMAX = Cl[2];
                    let newBitrate = abrController.getQualityForBitrate(mediaInfo,BitrateMAX,netwrokstatus[7]); // get index
                    switchRequest = SwitchRequest(context).create(newBitrate+1, SwitchRequest.STRONG);
                    BitrateSelected = getbitratefromindex(switchRequest.value,mediaInfo,abrController);
                }
                let BitrateSelectedInt = parseInt(BitrateSelected[0]);
                let QtMax = bitratequalitymap(BitrateSelectedInt,Contenet);
                if (actionMAX.length === 0) {
                    actionMAX.push([BitrateSelectedInt,QtMax]);
                }
                previousQtMax = QtMax;
                newBitrateList = getNewBitrateList(mediaInfo,abrController,BitrateSelectedInt);
                /* 2. Compute MAX QoE */

                let VideoDuration = streamInfo.duration.toFixed(0);
                let StepQT = bitratequalitymap(BitrateSelectedInt,Contenet);
                let StepUtilityMAX = ComputeUtilityMAX(VideoDuration,QtMax,BitrateSelectedInt,StepQT,step);
                let UtilitymetricsStor = getutilitymetrics(); // Just To confirm StepUtilityMAX
                let StepUtilityMAXStor = computeQoE(UtilitymetricsStor[0],QtMax,UtilitymetricsStor[2],UtilitymetricsStor[3]/step,UtilitymetricsStor[4]/VideoDuration);
                if (isNaN(StepUtilityMAXStor) || StepUtilityMAXStor > 5) {
                    StepUtilityMAXStor = QtMax * 5;
                }

                /* 3. Action-Utility relationship : Function f: a -> u */
                let strategyMaxSet = actionutilityrelation(actionMAX,StepUtilityMAX);
				
				/* 4. Other Actions with their utilities, action-utility function */
                let ActionsOTH = otheractions(BitrateSelectedInt,abrController,mediaInfo);
                let actionoth = ActionsOTH[1];
                let StepUtilityOTH = ComputeOtherUtilities(VideoDuration,actionoth,step);
                for (var k = 0, lk = actionoth.length; k < lk; k += 1) {
                    StepUtilityOTHStor[k] = computeQoE(UtilitymetricsStor[0],actionoth[k][1],UtilitymetricsStor[2],UtilitymetricsStor[3]/step,UtilitymetricsStor[4]/VideoDuration);
                    if (isNaN(StepUtilityOTHStor[k]) || StepUtilityOTHStor[k] > 5) {
                        StepUtilityOTHStor[k] = actionoth[k][1] * 5;
                    }
                }
                let strategyOtherSet = actionutilityrelationOther(actionoth,StepUtilityOTH); // f: a -> u for all other decisions (that we named suboptimal decisions Y)

                /* 5. Compute Bargaining Power */
                alphaPower = getBargainingPower(BargainingPower[2],NCl);

                /* 6. Compute Bargaining Outcome for both MAX and Others */
                BargainingOutcome = ComputeBargainingOutcome(BitrateMAX,QtMax,StepUtilityMAX,actionoth,StepUtilityOTH,alphaPower); // Optimal x at each step
                let BargainingOutcomeAllSet = storbargainingoutcomeall(BargainingOutcome[0]);
                let BargainingOutcomeOptSet = storbargainingoutcomeopt(BargainingOutcome[1]);

                /* 7. Estimation of other coalition members varaibles: Their Optimal Actions, Optimal Utilities, Optimal BargainingOutcome*/
                let CoalitionMembersAction = DecisionEstimationLearningPip(actionoth,BargainingOutcome,NCl,netwrokstatus[0],newBitrateList,BitrateSelectedInt,QtMax,switchRequest,abrController,mediaInfo,ActionsOTH,StepUtilityMAX,actionMAX,VideoDuration,step,UtilitymetricsStor,StepUtilityMAXStor,strategyMaxSet,StepUtilityOTH,StepUtilityOTHStor,strategyOtherSet,alphaPower, BargainingOutcomeAllSet,BargainingOutcomeOptSet,netwrokstatus[7]);
                // Udpdating Above variables
                switchRequest = CoalitionMembersAction[0];
                QtMax = CoalitionMembersAction[1];
                actionMAX = CoalitionMembersAction[2];
                newBitrateList = CoalitionMembersAction[3];
                let BitrateSelec = getbitratefromindex(switchRequest.value,mediaInfo,abrController);
                if (actionMAX.length === 0) {
                    actionMAX.push([parseInt(BitrateSelec[0]),QtMax]);
                }
                StepQT = QtMax;
                StepUtilityMAX = CoalitionMembersAction[4];
                UtilitymetricsStor = CoalitionMembersAction[5];
                StepUtilityMAXStor = CoalitionMembersAction[6];
                strategyMaxSet = CoalitionMembersAction[7];
                ActionsOTH = CoalitionMembersAction[8];
                actionoth = CoalitionMembersAction[9];
                StepUtilityOTH = CoalitionMembersAction[10];
                StepUtilityOTHStor = CoalitionMembersAction[11];
                strategyOtherSet = CoalitionMembersAction[12];
                BargainingOutcome = CoalitionMembersAction[13];
                BargainingOutcomeAllSet = CoalitionMembersAction[14];
                BargainingOutcomeOptSet = CoalitionMembersAction[15];
				
                // New variables Related to Local Objective and Potantial Functions + Consensus and its Upditing Rule
                let LocalObjFunction = CoalitionMembersAction[16];
                let LocalObjfBitrate = LocalObjFunction[0][0];
                let LocalObjFunctionOpt = CoalitionMembersAction[17];
                let LocalObjfBitrateOpt = LocalObjFunctionOpt[0][0];
                let LocalObjfBitrateOptIndex = LocalObjFunctionOpt[0][1];
                let LocalObjfBitrateOptValue = LocalObjFunctionOpt[0][2];
                let LocalObjfSSIMplusOpt = LocalObjFunctionOpt[0][3];
                let LocalObjfSSIMplusOptIndex = LocalObjFunctionOpt[0][4];
                let LocalObjfSSIMplusOptValue = LocalObjFunctionOpt[0][5];
                let TotalLocalObjPotf = CoalitionMembersAction[18];
                let TotalLocalObjfBitrateOpt = TotalLocalObjPotf[0][0];
                let TotalLocalObjfSSIMplusOpt = TotalLocalObjPotf[0][1];
                let TotalLocalPotfBitrateOptFinal = TotalLocalObjPotf[0][2];
                let TotalLocalPotfSSIMplusOptFinal = TotalLocalObjPotf[0][3];
                let ConsensusUpdatingRule = CoalitionMembersAction[19];
                let ConsensusUpdatingBitrateNext = ConsensusUpdatingRule[0][0];
                let ConsensusUpdatingSSIMplusNext = ConsensusUpdatingRule[0][1];

                /* 8. Compute Chunk Download Time; we can easily add this cosntraint CurrentChunkDonwloadTime < ChunkDuration Please refer to BolaAbandonRule.js  as wall */
                let CurrentChunkDonwloadTime = netwrokstatus[6];
                let ChunkDuration = streamProcessor.getCurrentRepresentationInfo().fragmentDuration;
                let ChunkDonwloadTimeMAX = 0;
                if (getbitratefromindex(switchRequest.value,mediaInfo,abrController)[0] === netwrokstatus[4]) {
                    ChunkDonwloadTimeMAX = ((lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime()) || 1) / 1000;
                }
                
                /* 9. electing bitrate "switchRequest.value" based on objective function and Preferance coalition Rule
                /* 9a. Preferance Rule Function: Put bitrates that can selected from whol bitrate lists in deffrent listes based on width/height of each chunk */
                
                current = switchRequest.value; // update current
                let IndexBMAX = abrController.getQualityForBitrate(mediaInfo,BitrateMAX) + 1;

                /* 6th Constraint: BW constraint */
                if (abrController.getAbandonmentStateFor(mediaType) !== AbrController.ABANDON_LOAD && netwrokstatus[1] !== null) {
                    if (bufferStateVO.state === BufferController.BUFFER_LOADED || isDynamic) {
                        newRATEIndex = abrController.getQualityForBitrate(mediaInfo, netwrokstatus[1]);
                        if (newRATEIndex > IndexBMAX) {
                            newRATEIndex = IndexBMAX;
                        }
                        streamProcessor.getScheduleController().setTimeToLoadDelay(0);
                        switchRequest.value = newRATEIndex;
                        switchRequest.priority = SwitchRequest.DEFAULT;
                    }

                    if (current !== SwitchRequest.NO_CHANGE && current !== switchRequest.value) {
                        log('ThroughputRule requesting switch to index: ', switchRequest.value, 'type: ',mediaType, ' Priority: ', switchRequest.priority === SwitchRequest.DEFAULT ? 'Default' : switchRequest.priority === SwitchRequest.STRONG ? 'Strong' : 'Weak', 'Average throughput', Math.round(netwrokstatus[1]), 'kbps');
                    }
                }

                if (lockCurrent === true) {
                    current = switchRequest.value;
                }
                /* 1st Constraint: Index of Bitrate selected using Decision function local (Objective/potintial) functions, should be equal to Step BargainingOutcome optimal (x*) index*/
                if (BargainingOutcome[1].length === 0 || BargainingOutcome[1].length === 1) {
                    if (current !== switchRequest.NO_CHANGE && current !== BargainingOutcome[1][0][3] + 1) {
                        newRATEIndex = BargainingOutcome[1][0][3] + 1;
                        if (newRATEIndex > IndexBMAX) {
                            newRATEIndex = IndexBMAX;
                        }
                        switchRequest.value = newRATEIndex;
                        switchRequest = SwitchRequest(context).create(newRATEIndex, SwitchRequest.STRONG);
                    }
                }
                else {
                    if (current !== switchRequest.NO_CHANGE && current !== BargainingOutcome[1][BargainingOutcome[1].length - 1][3] + 1) {
                        newRATEIndex = BargainingOutcome[1][BargainingOutcome[1].length - 1][3] + 1;
                        if (newRATEIndex > IndexBMAX) {
                            newRATEIndex = IndexBMAX;
                        }
                        switchRequest.value = newRATEIndex;
                        switchRequest = SwitchRequest(context).create(newRATEIndex, SwitchRequest.STRONG);
                    }
                }

                /* 2nd Constraint: (Objective/potintial) functions*/
                if (lockCurrent === true) {
                    current = switchRequest.value;
                }
                if (current !== SwitchRequest.NO_CHANGE && current !== LocalObjfBitrateOptIndex+1) {
                    if (TotalLocalObjfBitrateOpt !== 0 && TotalLocalPotfBitrateOptFinal !== 0) {
                        newRATEIndex = Math.min.apply(Math,LocalObjfBitrate);
                        if (newRATEIndex > IndexBMAX) {
                            newRATEIndex = IndexBMAX;
                        }
                        if (current !== SwitchRequest.NO_CHANGE && current !== newRATEIndex) {
                            switchRequest.value = newRATEIndex;
                            switchRequest = SwitchRequest(context).create(newRATEIndex, SwitchRequest.STRONG);
                        }
                    }
                    else {
                        newRATEIndex = LocalObjfBitrateOptIndex+1;
                        if (newRATEIndex > IndexBMAX) {
                            newRATEIndex = IndexBMAX;
                        }
                        switchRequest.value = newRATEIndex;
                        switchRequest = SwitchRequest(context).create(newRATEIndex, SwitchRequest.STRONG);
                    }
                }

                /* 3rd Constraint: Consensus update rule, should be equal*/
                if (lockCurrent === true) {
                    current = switchRequest.value;
                }
                if (ConsensusUpdatingBitratePrevious > 0) {
                    let ConsensusBitrateIndex = abrController.getQualityForBitrate(mediaInfo, ConsensusUpdatingBitratePrevious);
                    let selecting = getbitratefromindex(ConsensusBitrateIndex,mediaInfo,abrController);
                    let ConsensusBitrate = parseInt(selecting[0]);
                    if (current !== SwitchRequest.NO_CHANGE && current !== ConsensusBitrateIndex) {
                        newRATEIndex = ConsensusBitrateIndex;
                        if (newRATEIndex > IndexBMAX) {
                            newRATEIndex = IndexBMAX;
                        }
                        switchRequest.value = newRATEIndex;
                        switchRequest = SwitchRequest(context).create(newRATEIndex, SwitchRequest.STRONG);
                    }
                }
                ConsensusUpdatingBitratePrevious = ConsensusUpdatingBitrateNext;
                ConsensusUpdatingSSIMplusPrevious = ConsensusUpdatingSSIMplusNext;

                /* 4th Constraint: Chunk download time and congestion level */
                if (lockCurrent === true) {
                    current = switchRequest.value;
                }
                if (CurrentChunkDonwloadTime > ChunkDuration) {
                    if (!isNaN(request.index)) {
                        setFragmentRequestDict(mediaType, request.index);
                        const fragmentInfo = fragmentDict[mediaType][request.index];
                        if (fragmentInfo === null || request.firstByteDate === null || abandonDict.hasOwnProperty(fragmentInfo.id)) {
                            newRATEIndex = switchRequest.value;
                        }
                        if (fragmentInfo.firstByteTime === undefined) {
                            throughputArrayV2[mediaType] = [];
                            fragmentInfo.firstByteTime = request.firstByteDate.getTime();
                            fragmentInfo.segmentDuration = request.duration;
                            fragmentInfo.bytesTotal = request.bytesTotal;
                            fragmentInfo.id = request.index;
                        }
                        fragmentInfo.bytesLoaded = request.bytesLoaded;
                        fragmentInfo.elapsedTime = new Date().getTime() - fragmentInfo.firstByteTime;
                        if (fragmentInfo.bytesLoaded > 0 && fragmentInfo.elapsedTime > 0) {
                            storeLastRequestThroughputByTypeV2(mediaType, Math.round(fragmentInfo.bytesLoaded * 8 / fragmentInfo.elapsedTime));
                        }

                        if (throughputArrayV2[mediaType].length >= MIN_LENGTH_TO_AVERAGE && fragmentInfo.elapsedTime > GRACE_TIME_THRESHOLD && fragmentInfo.bytesLoaded < fragmentInfo.bytesTotal) {
                            const totalSampledValue = throughputArrayV2[mediaType].reduce((a, b) => a + b, 0);
                            fragmentInfo.measuredBandwidthInKbps = Math.round(totalSampledValue / throughputArrayV2[mediaType].length);
                            fragmentInfo.estimatedTimeOfDownload = +((fragmentInfo.bytesTotal * 8 / fragmentInfo.measuredBandwidthInKbps) / 1000).toFixed(2);

                            if (fragmentInfo.estimatedTimeOfDownload < fragmentInfo.segmentDuration * ABANDON_MULTIPLIER || rulesContext.getTrackInfo().quality === 0 ) {
                                newRATEIndex = switchRequest.value;
                            } else if (!abandonDict.hasOwnProperty(fragmentInfo.id)) {
                                const bytesRemaining = fragmentInfo.bytesTotal - fragmentInfo.bytesLoaded;
                                const BLIST = abrController.getBitrateList(mediaInfo);
                                newRATEIndex = abrController.getQualityForBitrate(mediaInfo, fragmentInfo.measuredBandwidthInKbps * mediaPlayerModel.getBandwidthSafetyFactor());
                                if (newRATEIndex > IndexBMAX) {
                                    newRATEIndex = IndexBMAX;
                                }
                                const estimateOtherBytesTotal = fragmentInfo.bytesTotal * BLIST[newRATEIndex].bitrate / BLIST[abrController.getQualityFor(mediaType, mediaInfo.streamInfo)].bitrate;

                                if (bytesRemaining > estimateOtherBytesTotal) {
                                    switchRequest.value = newRATEIndex;
                                    switchRequest.reason.throughput = fragmentInfo.measuredBandwidthInKbps;
                                    switchRequest.reason.fragmentID = fragmentInfo.id;
                                    abandonDict[fragmentInfo.id] = fragmentInfo;
                                    log('AbandonRequestsRule ( ', mediaType, 'frag id',fragmentInfo.id,') is asking to abandon and switch to quality to ', newRATEIndex, ' measured bandwidth was', fragmentInfo.measuredBandwidthInKbps);
                                    switchRequest = SwitchRequest(context).create(newRATEIndex, SwitchRequest.STRONG);
                                    delete fragmentDict[mediaType][fragmentInfo.id];
                                }
                            }
                        } else if (fragmentInfo.bytesLoaded === fragmentInfo.bytesTotal) {
                            delete fragmentDict[mediaType][fragmentInfo.id];
                        }
                    }
                }

                /* 5th Constraint: Buffer Occupancy */
                if (lockCurrent === true) {
                    current = switchRequest.value;
                }
                setBufferInfo(mediaType, bufferStateVO.state);
                if (CurrentbufferLevel < MinBuff || CurrentbufferLevel > MaxBuff) {
					if (CurrentbufferLevel < MinBuff) {
						switchRequest.value = 0;
						switchRequest.priority = SwitchRequest.STRONG;
						switchRequest = SwitchRequest(context).create(0, SwitchRequest.STRONG);
					}	
                    if (bufferStateVO.state === BufferController.BUFFER_EMPTY && bufferStateDict[mediaType].firstBufferLoadedEvent !== undefined) {
                        switchRequest.value = 0;
                        switchRequest.priority = SwitchRequest.STRONG;
                        switchRequest = SwitchRequest(context).create(0, SwitchRequest.STRONG);
                    }
                    if (current !== SwitchRequest.NO_CHANGE && current !== switchRequest.value) {
                        log('InsufficientBufferRule requesting switch to index: ', switchRequest.value, 'type: ',mediaType, ' Priority: ', switchRequest.priority === SwitchRequest.DEFAULT ? 'Default' : switchRequest.priority === SwitchRequest.STRONG ? 'Strong' : 'Weak');
                    }
                }
                let FbitrateS = getbitratefromindex(switchRequest.value,mediaInfo,abrController);
                QtMax = bitratequalitymap(parseInt(FbitrateS[0]),Contenet);
                StepQT = QtMax;
                StepUtilityMAX = ComputeUtilityMAX(VideoDuration,QtMax,parseInt(FbitrateS[0]),StepQT,step);
                UtilitymetricsStor = getutilitymetrics();
                StepUtilityMAXStor = computeQoE(UtilitymetricsStor[0],QtMax,UtilitymetricsStor[2],UtilitymetricsStor[3]/step,UtilitymetricsStor[4]/VideoDuration);
                if (isNaN(StepUtilityMAXStor) || StepUtilityMAXStor > 5) {
                    StepUtilityMAXStor = QtMax * 5;
                }
                let OptimalBargainingOutcomeBitrate = BargainingOutcome[1][0][0];
                let OptimalBargainingOutcomeQuality = BargainingOutcome[1][0][1];
                let OptimalBargainingOutcomeUtility = BargainingOutcome[1][0][2];
                let OptimalBargainingOutcomeBitrateIndex = BargainingOutcome[1][0][3] + 1;
                let OptimalBargainingOutcomeQualityIndex = BargainingOutcome[1][0][4] + 1;
                let OptimalBargainingOutcomeUtilityIndex = BargainingOutcome[1][0][5] + 1;

                if (BargainingOutcome[1].length === 0 || BargainingOutcome[1].length === 1) {
                    OptimalBargainingOutcomeBitrate = BargainingOutcome[1][0][0];
                    OptimalBargainingOutcomeQuality = BargainingOutcome[1][0][1];
                    OptimalBargainingOutcomeUtility = BargainingOutcome[1][0][2];
                    OptimalBargainingOutcomeBitrateIndex = BargainingOutcome[1][0][3] + 1;
                    OptimalBargainingOutcomeQualityIndex = BargainingOutcome[1][0][4] + 1;
                    OptimalBargainingOutcomeUtilityIndex = BargainingOutcome[1][0][5] + 1;
                }
                else {
                    OptimalBargainingOutcomeBitrate = BargainingOutcome[1][BargainingOutcome[1].length - 1][0];
                    OptimalBargainingOutcomeQuality = BargainingOutcome[1][BargainingOutcome[1].length - 1][1];
                    OptimalBargainingOutcomeUtility = BargainingOutcome[1][BargainingOutcome[1].length - 1][2];
                    OptimalBargainingOutcomeBitrateIndex = BargainingOutcome[1][BargainingOutcome[1].length - 1][3] + 1;
                    OptimalBargainingOutcomeQualityIndex = BargainingOutcome[1][BargainingOutcome[1].length - 1][4] + 1;
                    OptimalBargainingOutcomeUtilityIndex = BargainingOutcome[1][BargainingOutcome[1].length - 1][5] + 1;
                }
               LogInfo.push([Cl[0],Resolution,Contenet,Service,netwrokstatus[0],netwrokstatus[1],parseInt(FbitrateS[0]),switchRequest.value+1,QtMax,BitrateMAX,IndexBMAX,bitratequalitymap(BitrateMAX,Contenet),CurrentbufferLevel,MinBuff,MaxBuff,StepUtilityMAX,StepUtilityMAXStor,AvgSSIMplusQT,UtilitymetricsStor[0],AvgEvtStalls,AvgEvtStallsDuration,AvgSSIMplusQTSwitch,TotalAvgSSIMplusQTSwitch,netwrokstatus[7]/1000,CurrentChunkDonwloadTime,ChunkDuration,netwrokstatus[2],OptimalBargainingOutcomeBitrate,OptimalBargainingOutcomeQuality,OptimalBargainingOutcomeUtility,OptimalBargainingOutcomeBitrateIndex,OptimalBargainingOutcomeQualityIndex,OptimalBargainingOutcomeUtilityIndex,LocalObjfBitrateOpt,LocalObjfBitrateOptValue,LocalObjfBitrateOptIndex,LocalObjfSSIMplusOpt,LocalObjfSSIMplusOptValue,LocalObjfSSIMplusOptIndex,TotalLocalObjfBitrateOpt,TotalLocalObjfSSIMplusOpt,TotalLocalPotfBitrateOptFinal,TotalLocalPotfSSIMplusOptFinal,ConsensusUpdatingBitratePrevious,ConsensusUpdatingBitrateNext,ConsensusUpdatingSSIMplusPrevious,ConsensusUpdatingSSIMplusNext]);
                getGTA(LogInfo[0]);
                step = time/ChunkDuration + 1;
                break;
        }

        return switchRequest;
    }

    function reset() {
        bufferStateDict = {};
        setup();
    }
    instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;
}

GTA.__dashjs_factory_name = 'GTA';
let factory = FactoryMaker.getClassFactory(GTA);
export default factory;
