function PPTGenerator() {

	return {

		oResultSet: {},
		iDateIndex: 0,
		iTimeIndex: 0,
		iAppServerIndex: 0,
		iMeasuresIndex: 0,
		aDataSet: [],
		createPlaceholder: true,

		init: function () {
			
			this.oResultSet = {};
			this.iDateIndex = 0;
			this.iTimeIndex = 0;
			this.iAppServerIndex = 0;
			this.iMeasuresIndex = 0;
			this.aDataSet = [];
			this.bCreatePlaceHolder = document.querySelector("#placeHolderSwitch").checked;
		},

		getTextControlReference: function () {
			return document.querySelector("#dataSet");
		},
		clear: function () {
			this.getTextControlReference().value = '';
		},
		setDataPayload: function () {

			// First step will be to get all the different parameters in the passed in dataset

			// Get everything the user entered -
			let sDataSet = this.getTextControlReference().value;

			// No input? Stop
			if (sDataSet.trim() === "")
				throw new Error("- No input -");

			// Split by new line -
			this.aDataSet = sDataSet.split(/\r\n|\n|\r/);

		},

		setMeasuresIndex: function () {
			for (this.iMeasuresIndex = 0; this.iMeasuresIndex < this.aDataSet.length; this.iMeasuresIndex++) {
				if ((this.aDataSet[this.iMeasuresIndex].indexOf("AS Instance") !== -1) ||
					(this.aDataSet[this.iMeasuresIndex].indexOf("Server Name") !== -1) ||
					(this.aDataSet[this.iMeasuresIndex].indexOf("Act. WPs") !== -1))
					break;
			}

			if (this.iMeasuresIndex === this.aDataSet.length)
				throw new Error("- Invalid input; no AS Instance or Server Name found in dataset -");

		},

		buildEmptyResultSet: function () {

			// Get the raw measures -

			const aMeasureList = this.aDataSet[this.iMeasuresIndex].split('|').map(measure => measure.trim());

			// There has to be at least three measures, time, app server + one other metric
			if (aMeasureList.length < 3)
				throw new Error("- Invalid input; Measures parsing failed - ");

			//All good, make the result set -
			for (let i = 0; i < aMeasureList.length; i++) {

				const sCurrentMeasure = aMeasureList[i];

				if (sCurrentMeasure) {

					if (sCurrentMeasure !== "") {

						// Is it one of the special measures?
						if (sCurrentMeasure.toLowerCase() == "date" && this.iDateIndex === 0)
							this.iDateIndex = i;

						else if (sCurrentMeasure.toLowerCase() == "time" && this.iTimeIndex === 0)
							this.iTimeIndex = i;

						else if (sCurrentMeasure.toLowerCase() == "as instance" && this.iAppServerIndex === 0)
							this.iAppServerIndex = i;

						else if (sCurrentMeasure.toLowerCase() == "server name" && this.iAppServerIndex === 0)
							this.iAppServerIndex = i;

						else if (this.oResultSet[sCurrentMeasure]) {
							this.oResultSet[sCurrentMeasure + "-1"] = {
								"index": i
							};
						} else {
							this.oResultSet[sCurrentMeasure] = {
								"index": i
							};
						}
					}
				}
			}

			// Just one app server?
			if (this.iTimeIndex !== 0 && this.iAppServerIndex === 0)
				this.iAppServerIndex = this.iTimeIndex;

			if (this.iTimeIndex === 0 || this.iAppServerIndex === 0)
				throw new Error("- Cannot find index for Time or App Server in DataSet -");
		},

		fillResultSet: function () {
			// // TODO: Add this back into result set
			// let sDate = this.aDataSet[0].trim().split(' ')[0];

			let aKnownMeasures = Object.keys(this.oResultSet);

			let aCurrentLine;

			if (this.iMeasuresIndex + 2 > this.aDataSet.length)
				throw new Error("- No lines after the measures -");

			for (let i = this.iMeasuresIndex + 2; i < this.aDataSet.length; i++) {

				// Break the line into several pieces -
				aCurrentLine = this.aDataSet[i].split("|");

				// Either a blank line or a line with -----------
				if (aCurrentLine.length < 2)
					continue;

				// Is this a line with Global Data?
				if (aCurrentLine[this.iAppServerIndex].trim() === "Global Data") {
					debugger;
					continue;
				}

				// Now start a loop for all known measures
				for (let j = 0; j < aKnownMeasures.length; j++) {
					// Break it down -

					// Get the JSON Object associated specifically with this measures -
					let oCurrentMeasure = this.oResultSet[aKnownMeasures[j]];

					let sServerName = this.iTimeIndex === this.iAppServerIndex ? "App Server" : aCurrentLine[this.iAppServerIndex];
					// In that JSON Object is there already info about this app server?
					if (!oCurrentMeasure[sServerName])
						oCurrentMeasure[sServerName] = {
							"TimeStamps": [],
							"Values": []
						};

					let oCurrentMeasureAppServer = oCurrentMeasure[sServerName];
					oCurrentMeasureAppServer.TimeStamps.push(aCurrentLine[this.iTimeIndex]);

					sCurrentLineValue = aCurrentLine[oCurrentMeasure.index];

					// There are no decimals in the SDF SMON result
					sCurrentLineValue = parseInt(sCurrentLineValue.replace(/,/g, "").replace(/\./g, ""));

					if (isNaN(sCurrentLineValue)) {
						debugger;
						throw new Error("Encountred a value that is not a number")
					}

					oCurrentMeasureAppServer.Values.push(sCurrentLineValue);
				}
			}

		},

		processDataSet: function () {
			
			this.init();
				
			this.updateButton("Validating Input...", true);

			this.setDataPayload();

			this.setMeasuresIndex();

			this.buildEmptyResultSet();

			this.fillResultSet();

		},

		beginProcessing: function () {

			try {
				this.processDataSet();
				this.buildPPT();
			} catch (e) {
				this.updateButton("Generate Report", false);
				this.updateInformationProvider(e);
				throw e;
			}

		},

		buildPPT: function () {

			let pptx = new PptxGenJS();

			let aAllMeasures = Object.keys(this.oResultSet);

			// Do a tweak here to show user info first -
			//Logins and Sessions
			if (aAllMeasures.indexOf("Sessions") !== -1) {
				aAllMeasures = aAllMeasures.filter(items => items !== "Sessions");
				aAllMeasures = ["Sessions", ...aAllMeasures];
			}

			if (aAllMeasures.indexOf("Logins") !== -1) {
				aAllMeasures = aAllMeasures.filter(items => items !== "Logins");
				aAllMeasures = ["Logins", ...aAllMeasures];
			}

			for (let i = 0; i < aAllMeasures.length; i++) {

				let iMinNumberInDataSet;

				let oSpecificInfo = this.oResultSet[aAllMeasures[i]];

				// Maybe we have something that isn't a measure? // TODO: Strengthen check
				if (!oSpecificInfo.index) continue;

				let slide = pptx.addSlide();
				slide.addText(this.getFriendlyText(aAllMeasures[i]), {
					x: 0.5,
					y: 0.7,
					w: 8,
					fontSize: 24
				});

				if (this.bCreatePlaceHolder) {
					slide.addText("--- Add Analysis Here ---", {
						x: 0.5,
						y: 4.25,
						w: 8,
						h: 0.5,
						isTextBox: true,
						line: {
							pt: '2',
							color: 'A9A9A9'
						},
						fontSize: 20
					});
				}

				let aAppServers = Object.keys(oSpecificInfo);

				let aAppServerChartInfo = [];
				for (let j = 0; j < aAppServers.length; j++) {
					let sAppServerName = aAppServers[j];

					let oSpecificAppServerInfo = oSpecificInfo[sAppServerName];

					//			Not adding index
					if (oSpecificAppServerInfo.TimeStamps && oSpecificAppServerInfo.Values) {

						// Check if the timestamps were in descending order
						// This is hard to do when the dataset is being built but easy on post processing

						// To check the timestamps we get the first and last timestamps first-

						const sFirstTS = oSpecificAppServerInfo.TimeStamps[0],
							sLastTS = oSpecificAppServerInfo.TimeStamps[oSpecificAppServerInfo.TimeStamps.length - 1];

						if (sFirstTS.split(":").length !== 3 ||
							sLastTS.split(":").length !== 3)
							throw new Error("Calculated timestamps are invalid!");

						const oFirstDate = new Date(),
							oLastDate = new Date();

						oFirstDate.setHours(sFirstTS.split(":")[0]);
						oFirstDate.setMinutes(sFirstTS.split(":")[1]);
						oFirstDate.setSeconds(sFirstTS.split(":")[2]);

						oLastDate.setHours(sLastTS.split(":")[0]);
						oLastDate.setMinutes(sLastTS.split(":")[1]);
						oLastDate.setSeconds(sLastTS.split(":")[2]);

						if (oFirstDate > oLastDate) {
							oSpecificAppServerInfo.TimeStamps.reverse();
							oSpecificAppServerInfo.Values.reverse();
						}

						let iCurrentAppServerMinValue = Math.min(...oSpecificAppServerInfo.Values);

						if (!iMinNumberInDataSet || iCurrentAppServerMinValue < iMinNumberInDataSet)
							iMinNumberInDataSet = iCurrentAppServerMinValue;

						aAppServerChartInfo.push({
							name: sAppServerName,
							labels: oSpecificAppServerInfo.TimeStamps,
							values: oSpecificAppServerInfo.Values
						});

					}
				}

				var oChartSettings = {
					x: 0.5,
					y: 1,
					w: 8,
					h: 3,
					// valAxisMinVal: 0,
					lineSize: 1,
					lineDataSymbol: "none",
					lineSmooth: true,
					showLegend: true,
					legendPos: 'r',
					catGridLine: {
						color: 'D8D8D8',
						style: 'none',
						size: 1
					},
					valGridLine: {
						color: 'D8D8D8',
						style: 'dash',
						size: 1
					}
				};

				// If the minimum number in the chart is < 10 then the y axis shows negative numbers

				// Prevent negative numbers by setting the min axis to 10
				if (iMinNumberInDataSet < 10)
					oChartSettings.valAxisMinVal = 0;

				slide.addChart(pptx.ChartType.line, aAppServerChartInfo, oChartSettings);
			}

			this.updateButton("Generating file...", true);

			var that = this;
			pptx.writeFile('SDF SMON Report')
				.then(function (fileName) {
					that.updateButton("Generate Report", false);
					that.updateInformationProvider('Saved! File Name: ' + fileName, true);
				});
		},

		updateButton: function (sText, bDisabled) {
			let oGenerateButton = document.querySelector("#reportGenerateButton");
			oGenerateButton.textContent = sText;
			oGenerateButton.disabled = bDisabled;
		},

		updateInformationProvider: function (sInfo, bClear) {

			document.querySelector("#successMessageHolder").innerText = sInfo;

			if (bClear) {
				setTimeout(function () {
					document.querySelector("#successMessageHolder").innerText = ""
				}, 4000);
			}
		},

		getFriendlyText: function (sTitle) {

			switch (sTitle) {
			case "Act. WPs":
				return "Number of Active Work Processes";
			case "Dia.WPs":
				return "Number of Active Dialog Work Processes";
			case "RFC WPs":
				return "Number of available WPs for RFCs";
			case "CPU Usr":
				return "CPU Utilization (User)";
			case "CPU Sys":
				return "CPU Utilization (System)";
			case "CPU Idle":
				return "CPU Utilization (Idle)";
			case "CPU.":
				return "CPUs Consumed";
			case "Ava.":
				return "Available CPUs";
			case "Rea.":
				return "Ready Time in %";
			case "Ste.":
				return "Steal Time in Seconds";
			case "Paging in":
				return "Paging in (% of RAM per hour)";
			case "Paging out":
				return "Paging out  (% of RAM per hour)";
			case "Free Mem.":
				return "Free Memory in % of RAM";
			case "FreeMem":
				return "Free Memory (MB)";
			case "Free(+FS)":
				return "Free Memory MB (incl. Filesystem Cache)";
			case "EM alloc.":
				return "Allocated Extended Memory in MB";
			case "EM attach.":
				return "Attached Extended Memory in MB";
			case "Heap Memor":
				return "Heap Memory in MB";
			case "Pri.":
				return "Priv Modes";
			case "Dia.":
				return "Dialog Queue Length";
			case "Ave.":
				return "Average Load last 20s";
			case "Ave.-1":
				return "Average Load last 60s";
			case "Upd.":
				return "Update Queue Length";
			case "Enq.":
				return "Enqueue Queue Length";
			case "Logins":
				return "Number of logins";
			case "Sessions":
				return "Number of sessions";
			case "Em global":
				return "Extended Memory Global";
			default:
				return sTitle;
			}
		}
	}
}