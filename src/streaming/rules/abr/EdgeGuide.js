/**************************************************************
 A template for edge assisted scheme
 Created by Xiaoteng Ma
 *************************************************************/

import SwitchRequest from '../SwitchRequest.js';
import BufferController from '../../controllers/BufferController.js';
import AbrController from '../../controllers/AbrController.js';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest'; //Variable name is different in different version of dash.js
import FactoryMaker from '../../../core/FactoryMaker.js';
import Debug from '../../../core/Debug.js';
import DashAdapter from '../../../dash/DashAdapter.js';
import MediaPlayerModel from '../../models/MediaPlayerModel.js';

function EdgeGuide(config) {

    let context = this.context; //Default
    let dashMetrics = config.dashMetrics; //Default
    let metricsModel = config.metricsModel; //Default
    let bufferMax; //To store buffer capacity
    let mediaPlayerModel; //Default
    let instance, //Default
        throughputArray, //Array stores the throughput
        bitrateArray,
        av, //Last value of throughput
        bv, //Last value of bitrate
        bitrate, //array to store list of availalbe bitrate
        bitrateCount, //number of available bitrate
        adapter; //Default
    /*Compute QoE varaibles*/
    var count;

    function setup() {
        throughputArray = [];
        bitrateArray = [];
        adapter = DashAdapter(context).getInstance();
        av = 0;
        bv = 0;
        bitrate = [];
        bitrateCount = 0;
        count = -1;
    }

    //Store throughput in array
    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        //Due to bug in dash.js, some very high flase throughput were getting reported. Remove it, if bug is fixed in thee impremented version.
        if (throughput < 100000000) {
            throughputArray[type].push(throughput);
        }
    }

    //Throughput Predection and smoothing
    /*Just the last throughput*/
    function averageThroughputByType(type) {
        var arrThroughput = throughputArray[type];
        var lenThroughput = arrThroughput.length;
        av = arrThroughput[lenThroughput - 1];
        return (av);
    }

    function requestFromEdge(url) {
        let request = new XMLHttpRequest();
        request.open('GET', 'http://219.223.189.145:8000/getTrack/', false);
        request.send();
    }

    function getMaxIndex(rulesContext) {
        var mediaInfo = rulesContext.getMediaInfo(); //Default
        var mediaType = mediaInfo.type; //Default
        var metrics = metricsModel.getReadOnlyMetricsFor(mediaType); //Default
        var streamProcessor = rulesContext.getStreamProcessor(); //Default
        var abrController = streamProcessor.getABRController(); //Default
        var isDynamic = streamProcessor.isDynamic(); //Default
        var lastRequest = dashMetrics.getCurrentHttpRequest(metrics);
        var switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK);
        let streamInfo = rulesContext.getStreamInfo(); //Stram information
        let duration = streamInfo.manifestInfo.duration; //Duration of video
        let bestR; // To store the bitrate to be requested
        var newQuality = 0; //Newly selected bitrate
        var buff = dashMetrics.getCurrentBufferLevel(metrics) ? dashMetrics.getCurrentBufferLevel(metrics) : 0.0; //current buffr occupancy
        var repSwitch = dashMetrics.getCurrentRepresentationSwitch(metrics);
        var streamIdx = streamInfo.index;
        var currentIndex = dashMetrics.getIndexForRepresentation(repSwitch.to, streamIdx);
        let bitrate = mediaInfo.bitrateList.map(b => b.bandwidth);
        let i;
        bitrateCount = bitrate.length;
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        count = count + 1;

    }

}
