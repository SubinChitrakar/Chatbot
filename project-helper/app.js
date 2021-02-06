'use strict';

const dialogflow = require('dialogflow');
const config = require('./config');
const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const request = require('request');
const pg = require('pg');
const app = express();
const uuid = require('uuid');

pg.defaults.ssl = false;

const entityMiddleware = require('./middleware/entity');
const scrapper = require('./middleware/scrapper_connector');

const userService = require('./services/user-service');
const categoryService = require('./services/category-service');
const subCategoryService = require('./services/sub-category-service');
const supervisorService = require('./services/supervisor-service');
const projectService = require('./services/project-service');
const researchService = require('./services/research-service');

let replies = [];
let subCategoryReplies = [];

let categoryJSON = {};
let subCategoryJSON = {};
let supervisorJSON = {};
let projectJSON = {};

let allCategories = {};
let allSubCategories = {};

let projectList = [];
let selectedCategoryOfUser = '';
let selectedSubCategoryOfUser = '';
let selectedProject = '';
let selectedProjectDetails = {};

let projectInfoStatus = false;
let projectResearchStatus = false;
let projectSupervisorStatus = false;
let findASupervisor = false;
let supervisorSelectNo = false;
let project_supervisor_project_supervisor = 0;
let find_supervisor_select_no = 0;

let skill_1 = '';

if (!config.FB_PAGE_TOKEN) {
    throw new Error('missing FB_PAGE_TOKEN');
}
if (!config.FB_VERIFY_TOKEN) {
    throw new Error('missing FB_VERIFY_TOKEN');
}
if (!config.GOOGLE_PROJECT_ID) {
    throw new Error('missing GOOGLE_PROJECT_ID');
}
if (!config.DF_LANGUAGE_CODE) {
    throw new Error('missing DF_LANGUAGE_CODE');
}
if (!config.GOOGLE_CLIENT_EMAIL) {
    throw new Error('missing GOOGLE_CLIENT_EMAIL');
}
if (!config.GOOGLE_PRIVATE_KEY) {
    throw new Error('missing GOOGLE_PRIVATE_KEY');
}
if (!config.FB_APP_SECRET) {
    throw new Error('missing FB_APP_SECRET');
}
if (!config.SERVER_URL) {
    throw new Error('missing SERVER_URL');
}
if (!config.PG_CONFIG) {
    throw new Error('missing PG_CONFIG');
}


app.set('port', (process.env.PORT || 8568));
app.use(bodyParser.json(
    {
        verify: verifyRequestSignature
    }));
app.use(express.static('public'));
app.use(bodyParser.urlencoded(
    {
        extended: false
    }));
app.use(bodyParser.json());


const credentials = {
    client_email: config.GOOGLE_CLIENT_EMAIL,
    private_key: config.GOOGLE_PRIVATE_KEY,
};

const sessionClient = new dialogflow.SessionsClient(
    {
        projectId: config.GOOGLE_PROJECT_ID,
        credentials
    }
);

const entityClient = new dialogflow.EntityTypesClient(
    {
        projectId: config.GOOGLE_PROJECT_ID,
        credentials
    }
);

const sessionIds = new Map();
const usersMap = new Map();

app.get('/', function (req, res) {
    entityMiddleware.getAllEntities(function (result) {
        result.forEach(element => {
            if (element.displayName === 'project-category') {
                categoryJSON = element;
            }

            if (element.displayName === 'project-sub-category') {
                subCategoryJSON = element;
            }

            if (element.displayName === 'project-supervisor') {
                supervisorJSON = element;
            }

            if (element.displayName === 'project-name') {
                projectJSON = element;
            }
        })
    }, entityClient, config.GOOGLE_PROJECT_ID);
    setTimeout(modifyingEntities, 1000);
    res.send('Welcome to Project Helper. Entities have been created');
});

app.get('/webhook/', function (req, res) {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
});

app.post('/', function (req, res) {
    let data = req.body;
    console.log('Request Data', data);
    res.sendStatus(200);
});

app.post('/webhook/', function (req, res) {
    let data = req.body;

    if (data.object == 'page') {
        data.entry.forEach(function (pageEntry) {
            let pageID = pageEntry.id;
            let timeOfEvent = pageEntry.time;

            pageEntry.messaging.forEach(function (messagingEvent) {
                if (messagingEvent.optin) {
                    receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if (messagingEvent.delivery) {
                    receivedDeliveryConfirmation(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedPostback(messagingEvent);
                } else if (messagingEvent.read) {
                    receivedMessageRead(messagingEvent);
                } else if (messagingEvent.account_linking) {
                    receivedAccountLink(messagingEvent);
                } else {
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });
        res.sendStatus(200);
    }
});


function receivedMessage(event) {
    let senderID = event.sender.id;
    let recipientID = event.recipient.id;
    let timeOfMessage = event.timestamp;
    let message = event.message;

    setSessionAndUser(senderID);

    let isEcho = message.is_echo;
    let messageId = message.mid;
    let appId = message.app_id;
    let metadata = message.metadata;

    let messageText = message.text;
    let messageAttachments = message.attachments;
    let quickReply = message.quick_reply;

    if (isEcho) {
        handleEcho(messageId, appId, metadata);
        return;
    } else if (quickReply) {
        handleQuickReply(senderID, quickReply, messageId);
        return;
    }

    if (messageText) {
        sendToDialogFlow(senderID, messageText);
    } else if (messageAttachments) {
        handleMessageAttachments(messageAttachments, senderID);
    }
}


function handleMessageAttachments(messageAttachments, senderID) {
    sendTextMessage(senderID, "Attachment received. Thank you.");
}


function handleQuickReply(senderID, quickReply, messageId) {
    let quickReplyPayload = quickReply.payload;

    switch (quickReplyPayload) {
        case "Find another Project":
        case "Select another Area":
            if (Object.keys(allCategories).length === 0 && allCategories.constructor === Object) {
                populateCategory();
                populateSubCategory();
            }

            selectInterestArea(senderID);
            break;

        case "Find a Supervisor":
            if (Object.keys(allCategories).length === 0 && allCategories.constructor === Object) {
                populateCategory();
                populateSubCategory();
            }
            findASupervisor = true;

            setTimeout(function () {
                setRepliesForSupervisors(senderID);
            }, 1000);

            break;

        case "Just Project Area":
            findProjectInOneCategory(senderID);
            break;

        case "Other Fields Too":
            getProjectsForOtherFields(senderID);
            break;

        case "More about Project":
            projectInfoStatus = true;
            moreAboutProject(senderID);
            break;

        case "Supervisors Info":
            projectSupervisorStatus = true;
            projectSupervisor(senderID);
            break;

        case "Research Materials":
            projectResearchStatus = true;
            sendTextMessage(senderID, "Give me few seconds to gather resources. ");
            getResearchMaterials(senderID);
            break;

        case "Do nothing":
        case "Nothing":
        case "No, Thank you":
            sendEventTrigger(senderID, 'goodbye');
            break;

        case "Games":
            if(findASupervisor)
                displaySupervisorListAccordingToCategory(senderID, Object.keys(allCategories).find(key => allCategories[key] === "Games"));
            else
                showListOfProjectFromCategories(senderID, Object.keys(allCategories).find(key => allCategories[key] === selectedCategoryOfUser), Object.keys(allCategories).find(key => allCategories[key] === "Games"));
            break;
        case "AI":
            if(findASupervisor)
                displaySupervisorListAccordingToCategory(senderID, Object.keys(allCategories).find(key => allCategories[key] === "AI"));
            else
                showListOfProjectFromCategories(senderID, Object.keys(allCategories).find(key => allCategories[key] === selectedCategoryOfUser), Object.keys(allCategories).find(key => allCategories[key] === "AI"));
            break;
        case "App Development":
            if(findASupervisor)
                displaySupervisorListAccordingToCategory(senderID, Object.keys(allCategories).find(key => allCategories[key] === "App Development"));
            else
                showListOfProjectFromCategories(senderID, Object.keys(allCategories).find(key => allCategories[key] === selectedCategoryOfUser), Object.keys(allCategories).find(key => allCategories[key] === "App Development"));
            break;
        case "Data Analytics":
            if(findASupervisor)
                displaySupervisorListAccordingToCategory(senderID, Object.keys(allCategories).find(key => allCategories[key] === "Data Analytics"));
            else
                showListOfProjectFromCategories(senderID, Object.keys(allCategories).find(key => allCategories[key] === selectedCategoryOfUser), Object.keys(allCategories).find(key => allCategories[key] === "Data Analytics"));
            break;
        case "Security":
            if(findASupervisor)
                displaySupervisorListAccordingToCategory(senderID, Object.keys(allCategories).find(key => allCategories[key] === "Security"));
            else
                showListOfProjectFromCategories(senderID, Object.keys(allCategories).find(key => allCategories[key] === selectedCategoryOfUser), Object.keys(allCategories).find(key => allCategories[key] === "Security"));
            break;
        case "Internet of Things":
            if(findASupervisor)
                displaySupervisorListAccordingToCategory(senderID, Object.keys(allCategories).find(key => allCategories[key] === "Internet Of Things"));
            else
                showListOfProjectFromCategories(senderID, Object.keys(allCategories).find(key => allCategories[key] === selectedCategoryOfUser), Object.keys(allCategories).find(key => allCategories[key] === "Internet of Things"));
            break;
        case "Cloud Computing":
            if(findASupervisor)
                displaySupervisorListAccordingToCategory(senderID, Object.keys(allCategories).find(key => allCategories[key] === "Cloud Computing"));
            else
                showListOfProjectFromCategories(senderID, Object.keys(allCategories).find(key => allCategories[key] === selectedCategoryOfUser), Object.keys(allCategories).find(key => allCategories[key] === "Cloud Computing"));
            break;
        case "Blockchain":
            if(findASupervisor)
                displaySupervisorListAccordingToCategory(senderID, Object.keys(allCategories).find(key => allCategories[key] === "Blockchain"));
            else
                showListOfProjectFromCategories(senderID, Object.keys(allCategories).find(key => allCategories[key] === selectedCategoryOfUser), Object.keys(allCategories).find(key => allCategories[key] === "Blockchain"));
            break;


        case "Mobile Development":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Mobile Development"));
            break;
        case "Database":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Database"));
            break;
        case "Web Development":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Web Development"));
            break;
        case "Computer Vision":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Computer Vision"));
            break;
        case "Robotics":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Robotics"));
            break;
        case "Machine Learning":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Machine Learning"));
            break;
        case "Virtual Reality":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Virtual Reality"));
            break;
        case "Game Engine":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Game Engine"));
            break;
        case "Augmented Reality":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Augmented Reality"));
            break;
        case "Data Visualisation":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Data Visualisation"));
            break;
        case "Data Optimisation":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Data Optimisation"));
            break;
        case "Data Mining":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Data Mining"));
            break;
        case "Forensics":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Forensics"));
            break;
        case "Encryption":
            showListOfProjectFromSubCategories(senderID, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser), Object.keys(allSubCategories).find(key => allSubCategories[key] === "Encryption"));
            break;

        case "Swift":
            skill_1 = "Swift";
            sortProjectList(senderID, skill_1);
            break;
        case "Java":
            skill_1 = "Java";
            sortProjectList(senderID, skill_1);
            break;

        case "NodeJS":
            skill_1 = "NodeJS";
            sortProjectList(senderID, skill_1);
            break;
        case "PHP":
            skill_1 = "PHP";
            sortProjectList(senderID, skill_1);
            break;
        case "C#":
            skill_1 = "C#";
            sortProjectList(senderID, skill_1);
            break;

        default:
            console.log("Quick reply for message %s with payload %s", messageId, quickReplyPayload);
            sendToDialogFlow(senderID, quickReplyPayload);
            break;
    }
}


function handleEcho(messageId, appId, metadata) {
    console.log("Received echo for message %s and app %d with metadata %s", messageId, appId, metadata);
}


function handleDialogFlowAction(sender, action, messages, contexts, parameters) {
    console.log('Action: ',action);
    console.log('Parameter: ',parameters);

    switch (action) {
        case "project_search":
            selectInterestArea(sender);
            break;

        case "project-selection.selected":
            selectedProject = '';
            selectedProjectDetails = {};

            projectInfoStatus = false;
            projectResearchStatus = false;
            projectSupervisorStatus = false;

            if (parameters.fields["project-category"].stringValue) {
                let selectedCategory = parameters.fields["project-category"].stringValue;

                selectedCategoryOfUser = selectedCategory;
                selectedSubCategoryOfUser = '';

                sendTextMessage(sender, selectedCategory + " is a fabulous project area. Let me see what I can find for you.");
                handleCategories(sender, selectedCategory);
            } else if (parameters.fields["project-sub-category"].stringValue) {
                let selectedSubCategory = parameters.fields["project-sub-category"].stringValue;

                selectedCategoryOfUser = '';
                selectedSubCategoryOfUser = selectedSubCategory;

                sendTextMessage(sender, "Ohh great! " +
                    "\n\nGive me a moment while I find you projects in " + selectedSubCategory);
                setTimeout(function () {
                    handleSubCategories(sender, selectedSubCategory);
                }, 1000);
            } else {
                displayAllProject(sender)
            }
            break;

        case "project_shortlist.project_shortlist-yes":
            let quickReply = [];
            quickReply = [{
                "content_type": "text",
                "title": "Just Project Area",
                "payload": "Just Project Area"
            }, {
                "content_type": "text",
                "title": "In Other Fields Too",
                "payload": "Other Fields Too"
            }];
            if (selectedCategoryOfUser)
                sendQuickReply(sender, "Are you looking for projects with " + selectedCategoryOfUser + " implemented in different fields or projects just in " + selectedCategoryOfUser + "?", quickReply);
            if (selectedSubCategoryOfUser)
                sendQuickReply(sender, "Are you looking for projects with " + selectedSubCategoryOfUser + " implemented in different fields or projects just in " + selectedSubCategoryOfUser + "?", quickReply);
            break;

        case "project_shortlist_mobile_dev_1.project_shortlist_mobile_dev_1-swift":
            skill_1 = "Swift";
            sortProjectList(sender, skill_1);
            break;

        case "project_shortlist_mobile_dev_1.project_shortlist_mobile_dev_1-java":
            skill_1 = "Java";
            sortProjectList(sender, skill_1);
            break;

        case "project_shortlist.project_shortlist-no":
            displayAllProject(sender);
            break;

        case "project_suitability.project_suitability-yes":
            selectedProject = parameters.fields["project-name"].stringValue;
            handleMessages(messages, sender);
            break;

        case "project_suitability.project_suitability-no.project_suitability-no-yes":
            selectInterestArea(sender);
            break;

        case "project_suitability.project_suitability-no.project_suitability-no-no":
            sendEventTrigger(sender, 'additional_work');
            break;

        case "project_info.project_info-yes":
            projectInfoStatus = true;
            moreAboutProject(sender);
            if (!projectSupervisorStatus)
                sendEventTrigger(sender, 'project_supervisors');
            else if (!projectResearchStatus)
                sendEventTrigger(sender, 'project_research');
            else
                sendEventTrigger(sender, 'additional_work');

            break;

        case "project_info.project_info-no":
            projectInfoStatus = true;
            if (!projectSupervisorStatus)
                sendEventTrigger(sender, 'project_supervisors');
            else if (!projectResearchStatus)
                sendEventTrigger(sender, 'project_research');
            else
                sendEventTrigger(sender, 'additional_work');

            break;

        case "project_research.project_research-no":
            projectResearchStatus = true;
            if (!projectSupervisorStatus)
                sendEventTrigger(sender, 'project_supervisors');
            else if (!projectInfoStatus)
                sendEventTrigger(sender, 'project_info');
            else
                sendEventTrigger(sender, 'additional_work');

            break;

        case "project_supervisors.project_supervisors-yes":
            projectSupervisorStatus = true;
            console.log('Check \n','Project Info: ', projectInfoStatus, '\nProject Supervisor: ', projectSupervisorStatus);
            projectSupervisor(sender);
            break;

        case "project_supervisor.project_supervisor-yes":
        case "project_supervisor_another.project_supervisor_another-yes":
            projectSupervisorStatus = true;
            if (parameters.fields["project-supervisor"].stringValue) {
                let selectedSupervisor = parameters.fields["project-supervisor"].stringValue;
                getSupervisorDetail(sender, selectedSupervisor);
            } else {
                handleMessages(messages, sender);
            }
            break;

        case "project_supervisor.project_supervisor-no":
            projectSupervisorStatus = true;
            project_supervisor_project_supervisor += 1;
            if (project_supervisor_project_supervisor > 1 && projectInfoStatus && projectResearchStatus) {
                sendEventTrigger(sender, 'additional_work');
                project_supervisor_project_supervisor = 0;
            } else
                handleMessages(messages, sender);
            break;

        case "project_supervisors.project_supervisors-no":
            projectSupervisorStatus = true;
            if (!projectInfoStatus)
                sendEventTrigger(sender, 'project_info');
            else if (!projectResearchStatus)
                sendEventTrigger(sender, 'project_research');
            else
                sendEventTrigger(sender, 'additional_work');

            break;

        case "project_research.project_research-yes":
            projectResearchStatus = true;
            sendTextMessage(sender, "Give me few seconds to gather resources. ");
            getResearchMaterials(sender);
            setTimeout(function () {
                console.log('Project Info: ', projectInfoStatus, '\nProject Supervisor: ', projectSupervisorStatus);
                if (!projectInfoStatus)
                    sendEventTrigger(sender, 'project_info');
                else if (!projectSupervisorStatus)
                    sendEventTrigger(sender, 'project_supervisors');
                else
                    sendEventTrigger(sender, 'additional_work');
            }, 10000);

            break;

        case "project_supervisor_another.project_supervisor_another-no":
            projectSupervisorStatus = true;
            if (!projectInfoStatus)
                sendEventTrigger(sender, 'project_info');
            else if (!projectResearchStatus)
                sendEventTrigger(sender, 'project_research');
            else
                sendEventTrigger(sender, 'additional_work');

            break;

        case "addition_work.addition_work-no":
            sendEventTrigger(sender, 'goodbye');
            break;

        case "find_supervisor_select-yes":
            if(supervisorSelectNo){
                setRepliesForSupervisors(sender);
                supervisorSelectNo = false;
            }
            else if (parameters.fields["project-supervisor"].stringValue) {
                let supervisorName = parameters.fields["project-supervisor"].stringValue;
                supervisorService.getSupervisorDetails(function (supervisorDetails) {
                    let messageString = supervisorName + '\n';
                    messageString += 'Position: ' + supervisorDetails['position'] + '\n';
                    messageString += 'Phone No: ' + supervisorDetails['phone_number'] + '\n';
                    messageString += 'Email: ' + supervisorDetails['email'] + '\n';

                    if (supervisorDetails['office_hours']) {
                        messageString += 'Office Hours: ' + supervisorDetails['office_hours'] + '\n';
                    }
                    messageString += 'Location: ' + supervisorDetails['location'];

                    sendTextMessage(sender, messageString);
                }, supervisorName);

                setTimeout(function () {
                    sendEventTrigger(sender, 'additional_work');
                }, 5000);
                findASupervisor = false;
            }
            else
                handleMessages(messages, sender);
            break;

        case "find_supervisor_select-no":
            if(find_supervisor_select_no > 1){
                sendEventTrigger(sender, 'additional_work');
                find_supervisor_select_no = 0;
            }
            else{
                supervisorSelectNo = true;
                find_supervisor_select_no += 1;
                handleMessages(messages, sender);
            }
            break;

        /*case "find_supervisor_select.find_supervisor_select-yes":
            findASupervisor = true;

            setTimeout(function () {
                setRepliesForSupervisors(sender);
            }, 1000);
            break;

        case "find_supervisor_select.find_supervisor_select-no":

            break;*/

        default:
            handleMessages(messages, sender);
            break;
    }
}


function handleMessage(message, sender) {
    switch (message.message) {
        case "text": //text
            message.text.text.forEach((text) => {
                if (text !== '') {
                    sendTextMessage(sender, text);
                }
            });
            break;
        case "quickReplies": //quick replies
            let replies = [];
            message.quickReplies.quickReplies.forEach((text) => {
                let reply =
                    {
                        "content_type": "text",
                        "title": text,
                        "payload": text
                    };
                replies.push(reply);
            });
            sendQuickReply(sender, message.quickReplies.title, replies);
            break;
        case "image": //image
            sendImageMessage(sender, message.image.imageUri);
            break;
    }
}


function handleCardMessages(messages, sender) {
    let elements = [];
    for (let m = 0; m < messages.length; m++) {
        let message = messages[m];
        let buttons = [];
        for (let b = 0; b < message.card.buttons.length; b++) {
            let isLink = (message.card.buttons[b].postback.substring(0, 4) === 'http');
            let button;
            if (isLink) {
                button = {
                    "type": "web_url",
                    "title": message.card.buttons[b].text,
                    "url": message.card.buttons[b].postback
                }
            } else {
                button = {
                    "type": "postback",
                    "title": message.card.buttons[b].text,
                    "payload": message.card.buttons[b].postback
                }
            }
            buttons.push(button);
        }
        let element = {
            "title": message.card.title,
            "image_url": message.card.imageUri,
            "subtitle": message.card.subtitle,
            "buttons": buttons
        };
        elements.push(element);
    }
    sendGenericMessage(sender, elements);
}


function handleMessages(messages, sender) {
    let timeoutInterval = 1100;
    let previousType;
    let cardTypes = [];
    let timeout = 0;
    for (let i = 0; i < messages.length; i++) {
        if (previousType == "card" && (messages[i].message != "card" || i == messages.length - 1)) {
            timeout = (i - 1) * timeoutInterval;
            setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
            cardTypes = [];
            timeout = i * timeoutInterval;
            setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
        } else if (messages[i].message == "card" && i == messages.length - 1) {
            cardTypes.push(messages[i]);
            timeout = (i - 1) * timeoutInterval;
            setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
            cardTypes = [];
        } else if (messages[i].message == "card") {
            cardTypes.push(messages[i]);
        } else {

            timeout = i * timeoutInterval;
            setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
        }
        previousType = messages[i].message;
    }
}


function handleDialogFlowResponse(sender, response) {
    let responseText = response.fulfillmentMessages.fulfillmentText;
    let messages = response.fulfillmentMessages;
    let action = response.action;
    let contexts = response.outputContexts;
    let parameters = response.parameters;

    sendTypingOff(sender);

    if (isDefined(action)) {
        handleDialogFlowAction(sender, action, messages, contexts, parameters);
    } else if (isDefined(messages)) {
        handleMessages(messages, sender);
    } else if (responseText == '' && !isDefined(action)) {
        sendTextMessage(sender, "I'm not sure what you want. Can you be more specific?");
    } else if (isDefined(responseText)) {
        sendTextMessage(sender, responseText);
    }
}


async function sendToDialogFlow(sender, textString, params) {

    sendTypingOn(sender);

    try {
        const sessionPath = sessionClient.sessionPath(
            config.GOOGLE_PROJECT_ID,
            sessionIds.get(sender)
        );
        const request = {
            session: sessionPath,
            queryInput: {
                text: {
                    text: textString,
                    languageCode: config.DF_LANGUAGE_CODE,
                },
            },
            queryParams: {
                payload: {
                    data: params
                }
            }
        };
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;
        handleDialogFlowResponse(sender, result);
    } catch (e) {
        console.log('error');
        console.log(e);
    }
}

async function sendEventTrigger(recipientId, triggerName) {
    sendTypingOn(recipientId);

    try {
        const sessionPath = sessionClient.sessionPath(
            config.GOOGLE_PROJECT_ID,
            sessionIds.get(recipientId)
        );
        const request = {
            session: sessionPath,
            queryInput: {
                event: {
                    name: triggerName,
                    languageCode: config.DF_LANGUAGE_CODE,
                },
            },
        };
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;
        handleDialogFlowResponse(recipientId, result);
    } catch (e) {
        console.log('error');
        console.log(e);
    }
}


function sendTextMessage(recipientId, text) {
    let messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: text
        }
    };
    callSendAPI(messageData);
}


function sendImageMessage(recipientId, imageUrl) {
    let messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: imageUrl
                }
            }
        }
    };
    callSendAPI(messageData);
}


function sendButtonMessage(recipientId, text, buttons) {
    let messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: text,
                    buttons: buttons
                }
            }
        }
    };
    callSendAPI(messageData);
}


function sendGenericMessage(recipientId, elements) {
    let messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: elements
                }
            }
        }
    };
    callSendAPI(messageData);
}

function sendQuickReply(recipientId, text, replies, metadata) {
    let messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: text,
            metadata: isDefined(metadata) ? metadata : '',
            quick_replies: replies
        }
    };
    callSendAPI(messageData);
}

function sendTypingOn(recipientId) {
    let messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_on"
    };
    callSendAPI(messageData);
}


function sendTypingOff(recipientId) {
    let messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_off"
    };
    callSendAPI(messageData);
}


function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v3.2/me/messages',
        qs: {
            access_token: config.FB_PAGE_TOKEN
        },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            let recipientId = body.recipient_id;
            let messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s",
                    recipientId);
            }
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}

function receivedPostback(event) {
    let senderID = event.sender.id;
    let recipientID = event.recipient.id;
    let timeOfPostback = event.timestamp;

    setSessionAndUser(senderID);

    let payload = event.postback.payload;

    switch (payload) {
        case 'FACEBOOK_WELCOME':
            setReplies();
            greetUserText(senderID);
            break;
        default:
            sendTextMessage(senderID, "I'm not sure what you want. Can you be more specific?");

    }

    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d", senderID, recipientID, payload, timeOfPostback);

}


function receivedMessageRead(event) {
    let senderID = event.sender.id;
    let recipientID = event.recipient.id;

    let watermark = event.read.watermark;
    let sequenceNumber = event.read.seq;

    console.log("Received message read event for watermark %d and sequence " +
        "number %d", watermark, sequenceNumber);
}


function receivedAccountLink(event) {
    let senderID = event.sender.id;
    let recipientID = event.recipient.id;

    let status = event.account_linking.status;
    let authCode = event.account_linking.authorization_code;

    console.log("Received account link event with for user %d with status %s " +
        "and auth code %s ", senderID, status, authCode);
}


function receivedDeliveryConfirmation(event) {
    let senderID = event.sender.id;
    let recipientID = event.recipient.id;
    let delivery = event.delivery;
    let messageIDs = delivery.mids;
    let watermark = delivery.watermark;
    let sequenceNumber = delivery.seq;

    if (messageIDs) {
        messageIDs.forEach(function (messageID) {
            console.log("Received delivery confirmation for message ID: %s",
                messageID);
        });
    }

    console.log("All message before %d were delivered.", watermark);
}


function receivedAuthentication(event) {
    let senderID = event.sender.id;
    let recipientID = event.recipient.id;
    let timeOfAuth = event.timestamp;

    let passThroughParam = event.optin.ref;

    console.log("Received authentication for user %d and page %d with pass " +
        "through param '%s' at %d", senderID, recipientID, passThroughParam,
        timeOfAuth);

    sendTextMessage(senderID, "Authentication successful");
}


function verifyRequestSignature(req, res, buf) {
    let signature = req.headers["x-hub-signature"];

    if (!signature) {
        throw new Error('Couldn\'t validate the signature.');
    } else {
        let elements = signature.split('=');
        let method = elements[0];
        let signatureHash = elements[1];

        let expectedHash = crypto.createHmac('sha1', config.FB_APP_SECRET)
            .update(buf)
            .digest('hex');

        if (signatureHash != expectedHash) {
            throw new Error("Couldn't validate the request signature.");
        }
    }
}


function isDefined(obj) {
    if (typeof obj == 'undefined') {
        return false;
    }

    if (!obj) {
        return false;
    }

    return obj != null;
}


app.listen(app.get('port'), function () {
    console.log('running on port', app.get('port'))
});


/*
* Additional Functions
* */
function setSessionAndUser(senderID) {
    if (!sessionIds.has(senderID)) {
        sessionIds.set(senderID, uuid.v1());
    }

    if (!usersMap.has(senderID)) {
        userService.addUser(function (user) {
            usersMap.set(senderID, user);
        }, senderID);
    }
}

async function resolveAfterXSeconds(x) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(x);
        }, x * 1000);
    });
}

function setReplies() {
    replies = [];
    if (replies.length === 0) {
        categoryService.getAllCategories(function (result) {
            result.forEach(element => {
                let payload = element.toUpperCase();
                payload = '<' + payload + '>';
                payload = payload.replace(/ /g, "_");

                replies.push({
                    'content_type': 'text',
                    'title': element,
                    'payload': payload
                });
            });
        });
    }
}

async function greetUserText(userId) {
    let user = usersMap.get(userId);
    if (!user) {
        await resolveAfterXSeconds(1);
        user = usersMap.get(userId);
    }

    if (Object.keys(allCategories).length === 0 && allCategories.constructor === Object) {
        populateCategory();
        populateSubCategory();
    }

    if (user) {
        sendQuickReply(userId, 'Hi ' + user.first_name + '! ' +
            '\nI am here to help you find a Project. ' +
            'Let\'s get started.' +
            '\n\nWhat kind of project are you looking for?', replies);
    } else {
        sendTextMessage(userId, 'Hi!' +
            '\nI am here to help you find a Project. ' +
            'Let\'s get started.' +
            '\n\nWhat kind of project are you looking for, like AI or Game Development? ');
    }
}

function selectInterestArea(sender) {
    setReplies();
    setTimeout(function () {
        sendQuickReply(sender, 'Which Project Area will you like to investigate?', replies);
    }, 100);
}

function modifyingEntities() {
    categoryService.getAllCategories(function (categoryList) {
        if (JSON.stringify(categoryJSON) === JSON.stringify({})) {
            entityMiddleware.createEntity(function (result) {
                console.log('Category Entity Created');
            }, entityClient, config.GOOGLE_PROJECT_ID, categoryList, 'project-category');
        } else {
            if (categoryJSON.entities.length != categoryList.length) {
                entityMiddleware.updateEntity(function (result) {
                    console.log('Updated Entity');
                }, entityClient, config.GOOGLE_PROJECT_ID, categoryList, categoryJSON);
            }
        }
    });

    subCategoryService.getAllSubCategories(function (subCategoryList) {
        if (JSON.stringify(subCategoryJSON) === JSON.stringify({})) {
            entityMiddleware.createEntity(function (result) {
                console.log('Category Entity Created');
            }, entityClient, config.GOOGLE_PROJECT_ID, subCategoryList, 'project-sub-category');
        } else {
            if (subCategoryJSON.entities.length != subCategoryList.length) {
                entityMiddleware.updateEntity(function (result) {
                    console.log('Updated Entity');
                }, entityClient, config.GOOGLE_PROJECT_ID, subCategoryList, subCategoryJSON);
            }
        }
    });

    supervisorService.getAllSupervisors(function (supervisorList) {
        if (JSON.stringify(supervisorJSON) === JSON.stringify({})) {
            entityMiddleware.createEntity(function (result) {
                console.log('Supervisor Entity Created');
            }, entityClient, config.GOOGLE_PROJECT_ID, supervisorList, 'project-supervisor');
        } else {
            if (supervisorJSON.entities.length != supervisorList.length) {
                entityMiddleware.updateEntity(function (result) {
                    console.log('Updated Entity');
                }, entityClient, config.GOOGLE_PROJECT_ID, supervisorList, supervisorJSON);
            }
        }
    });

    projectService.getAllProjects(function (projectList) {
        if (JSON.stringify(projectJSON) === JSON.stringify({})) {
            entityMiddleware.createEntity(function (result) {
                console.log('Project Entity Created');
            }, entityClient, config.GOOGLE_PROJECT_ID, projectList, 'project-name');
        } else {
            if (projectJSON.entities.length != projectList.length) {
                entityMiddleware.updateEntity(function (result) {
                    console.log('Updated Entity');
                }, entityClient, config.GOOGLE_PROJECT_ID, projectList, projectJSON);
            }
        }
    });
}

function handleCategories(sender, categoryName) {
    categoryService.getCategoryId(function (categoryId) {
        subCategoryService.getSubCategory(function (subCategories) {
            if (subCategories.length > 0) {
                setSubCategories(subCategories);
                setTimeout(function () {
                    sendQuickReply(sender, 'I found ' + subCategories.length + ' sub categories for ' + categoryName +
                        '.\n \nCan you select one of them. The one which lies in your interest maybe.', subCategoryReplies);
                }, 3000);
            } else {
                projectService.getProjectFromCategory(function (projects) {
                    setTimeout(function () {
                        displayProject(sender, categoryName, projects);
                    }, 2000);
                }, categoryId);
            }

        }, categoryId)
    }, categoryName)
}

function setSubCategories(subCategoryList) {
    subCategoryReplies = [];
    if (subCategoryReplies.length === 0) {
        subCategoryList.forEach(info => {
            let element = info['name'];
            let payload = element.toUpperCase();
            payload = '<' + payload + '>';
            payload = payload.replace(/ /g, "_");

            subCategoryReplies.push({
                'content_type': 'text',
                'title': element,
                'payload': payload
            });
        });
    }
}

function handleSubCategories(sender, subCategoryName) {
    subCategoryService.getSubCategoryId(function (subCategoryId) {
        projectService.getProjectsFromSubCategory(function (projects) {
            displayProject(sender, subCategoryName, projects)
        }, subCategoryId)
    }, subCategoryName);
}

function displayAllProject(sender) {
    if (selectedCategoryOfUser) {
        categoryService.getCategoryId(function (categoryId) {
            projectService.getProjectFromCategory(function (projects) {
                if (projects.length < 15) {
                    let projectListString = 'Here are all the projects of ' + selectedCategoryOfUser + ' for you: \n\n';

                    for (let i = 0; i < projects.length; i++) {
                        projectListString += (i + 1) + '. ' + projects[i]['project_name'] + '\n';
                    }

                    sendTextMessage(sender, projectListString);
                    setTimeout(function () {
                        sendEventTrigger(sender, 'project_suitability');
                    }, 5000)
                } else {
                    sendTextMessage(sender, 'Since there are ' + projects.length + ' projects for ' + selectedCategoryOfUser + ' . We urge you to short-list the project.')
                    setTimeout(function () {
                        sendEventTrigger(sender, 'project_shortlist');
                    }, 2000)
                }
            }, categoryId)
        }, selectedCategoryOfUser)
    }

    if (selectedSubCategoryOfUser) {
        subCategoryService.getSubCategoryId(function (subCategoryId) {
            projectService.getProjectsFromSubCategory(function (projects) {
                if (projects.length < 15) {
                    let projectListString = 'Here are all the projects of ' + selectedSubCategoryOfUser + ' for you: \n\n';

                    for (let i = 0; i < projects.length; i++) {
                        projectListString += (i + 1) + '. ' + projects[i]['project_name'] + '\n';
                    }

                    sendTextMessage(sender, projectListString);
                    setTimeout(function () {
                        sendEventTrigger(sender, 'project_suitability');
                    }, 5000)
                } else {
                    sendTextMessage(sender, 'Since there are ' + projects.length + ' projects for ' + selectedSubCategoryOfUser + ' . We urge you to short-list the project.')
                    setTimeout(function () {
                        sendEventTrigger(sender, 'project_shortlist');
                    }, 2000)
                }
            }, subCategoryId)
        }, selectedSubCategoryOfUser)
    }
}

function findProjectInOneCategory(sender) {
    if (selectedCategoryOfUser) {
        categoryService.getCategoryId(function (categoryId) {
            projectService.getProjectFromOneCategory(function (projects) {
                if (projects.length == 0) {
                    sendTextMessage(sender, 'Sorry but I could not find any project with just ' + selectedCategoryOfUser + ". \n\n" +
                        "However, I am compiling a list of projects with " + selectedCategoryOfUser + ". Give me few seconds.");
                    displayProjectWithOtherCategory(sender, categoryId)
                } else {
                    let projectListString = 'Here are all the projects with just ' + selectedCategoryOfUser + ':\n\n';

                    for (let i = 0; i < projects.length; i++) {
                        projectListString += (i + 1) + '. ' + projects[i]['project_name'] + '\n';
                    }

                    sendTextMessage(sender, projectListString);
                    setTimeout(function () {
                        sendEventTrigger(sender, 'project_suitability');
                    }, 5000)
                }
            }, categoryId)
        }, selectedCategoryOfUser)
    }

    if (selectedSubCategoryOfUser) {
        subCategoryService.getSubCategoryId(function (subCategoryId) {
            projectService.getProjectFromOneSubCategory(function (projects) {
                if (projects.length == 0) {
                    sendTextMessage(sender, 'Sorry but I could not find any project with just ' + selectedSubCategoryOfUser + ". \n\n" +
                        "However, I am compiling a list of projects with " + selectedSubCategoryOfUser + ". Give me few seconds.");
                    displayProjectWithOtherSubCategory(sender, subCategoryId)
                } else if (projects.length < 10) {
                    let projectListString = 'Here are all the projects with just ' + selectedCategoryOfUser + ':\n\n';

                    for (let i = 0; i < projects.length; i++) {
                        projectListString += (i + 1) + '. ' + projects[i]['project_name'] + '\n';
                    }

                    sendTextMessage(sender, projectListString);
                    setTimeout(function () {
                        sendEventTrigger(sender, 'project_suitability');
                    }, 5000)
                } else {
                    if (selectedSubCategoryOfUser === 'Mobile Development') {
                        sendTextMessage(sender, 'There are ' + projects.length + ' projects in ' + selectedSubCategoryOfUser + '. Therefore, I wanted to further shorten the list from programming language. ');
                        setTimeout(function () {
                            sendEventTrigger(sender, 'project_shortlist_mobile_dev_1');
                        }, 2000);
                    }

                    if (selectedSubCategoryOfUser === 'Web Development') {
                        sendTextMessage(sender, 'There are ' + projects.length + ' projects in ' + selectedSubCategoryOfUser + '. Therefore, I wanted to further shorten the list from programming language. ');
                        setTimeout(function () {
                            sendEventTrigger(sender, 'project_shortlist_web_dev_1');
                        }, 2000);
                    }
                }
            }, subCategoryId)
        }, selectedSubCategoryOfUser)
    }
}

function displayProjectWithOtherCategory(sender, categoryId) {
    projectService.getProjectFromCategory(function (projects) {
        let projectJSON = {};
        projects.forEach(project => {
            if (project['category_1'] != categoryId) {
                let currentCategoryName = allCategories[project['category_1']];
                if (projectJSON.hasOwnProperty(currentCategoryName)) {
                    projectJSON[currentCategoryName].push(project)
                } else {
                    projectJSON[currentCategoryName] = [];
                    projectJSON[currentCategoryName].push(project)
                }
            }

            if (project['category_2'] != categoryId) {
                let currentCategoryName = allCategories[project['category_2']];
                if (projectJSON.hasOwnProperty(currentCategoryName)) {
                    projectJSON[currentCategoryName].push(project)
                } else {
                    projectJSON[currentCategoryName] = [];
                    projectJSON[currentCategoryName].push(project)
                }
            }
        });

        setTimeout(function () {
            for (let key in projectJSON) {
                if (projectJSON.hasOwnProperty(key)) {
                    let projectList = projectJSON[key];
                    setTimeout(function () {
                        let messageString = selectedCategoryOfUser + ' with ' + key + '\n\n';
                        for (let i = 0; i < projectList.length; i++) {
                            messageString += (i + 1) + '. ' + projectList[i]['project_name'] + '\n'
                        }
                        sendTextMessage(sender, messageString);
                    }, 1000)
                }
            }
        }, 2000)

    }, categoryId);

    setTimeout(function () {
        sendEventTrigger(sender, 'project_suitability');
    }, 10000)
}

function displayProjectWithOtherSubCategory(sender, subCategoryId) {
    projectService.getProjectsFromSubCategory(function (projects) {
        let projectJSON = {};
        projects.forEach(project => {
            if (project['sub_category_1'] != subCategoryId) {
                let currentSubCategoryName = allSubCategories[project['sub_category_1']];
                if (projectJSON.hasOwnProperty(currentSubCategoryName)) {
                    projectJSON[currentSubCategoryName].push(project)
                } else {
                    projectJSON[currentSubCategoryName] = [];
                    projectJSON[currentSubCategoryName].push(project)
                }
            }

            if (project['sub_category_2'] != subCategoryId) {
                let currentSubCategoryName = allSubCategories[project['sub_category_2']];
                if (projectJSON.hasOwnProperty(currentSubCategoryName)) {
                    projectJSON[currentSubCategoryName].push(project)
                } else {
                    projectJSON[currentSubCategoryName] = [];
                    projectJSON[currentSubCategoryName].push(project)
                }
            }
        });

        setTimeout(function () {
            for (let key in projectJSON) {
                if (projectJSON.hasOwnProperty(key)) {
                    let projectList = projectJSON[key];
                    setTimeout(function () {
                        let messageString = selectedSubCategoryOfUser + ' with ' + key + '\n\n';
                        for (let i = 0; i < projectList.length; i++) {
                            messageString += (i + 1) + '. ' + projectList[i]['project_name'] + '\n'
                        }
                        sendTextMessage(sender, messageString);
                    }, 1000)
                }
            }
        }, 2000)
    }, subCategoryId)

    setTimeout(function () {
        sendEventTrigger(sender, 'project_suitability');
    }, 10000)
}

function displayProject(sender, category, projects) {
    projectList = projects;
    if (projects.length > 5) {
        sendTextMessage(sender, usersMap.get(sender).first_name + ", I found " + projects.length + " projects for " + category);

        setTimeout(function () {
            sendEventTrigger(sender, 'project_shortlist')
        }, 4000)

    } else {
        let projectListString = '';

        if (projects.length > 1) {
            projectListString += 'Here are few projects for you: \n\n'
        } else {
            projectListString += 'Here is a project for you: \n\n'
        }

        if (projects.length === 0) {
            noProject(sender, category)
        } else {
            for (let i = 0; i < projects.length; i++) {
                projectListString += (i + 1) + '. ' + projects[i]['project_name'] + '\n';
            }
            sendTextMessage(sender, projectListString);
            setTimeout(function () {
                sendEventTrigger(sender, 'project_suitability');
            }, 3000)
        }
    }
}

function noProject(sender, category) {
    sendQuickReply(sender, 'Apparently, we don\'t have any project in ' + category + '.\nSorry, but do you mind selecting another project area?', replies);
}

function moreAboutProject(sender) {
    projectService.getProjectFromName(function (result) {
        sendTextMessage(sender, selectedProject + " description: \n" + result['project_desc']);

        setTimeout(function () {
            let skillString = 'You would require knowledge in ';
            if (result['skill_1'])
                skillString += '\n1. ' + result['skill_1'];
            if (result['skill_2'])
                skillString += '\n2. ' + result['skill_2'];
            if (result['skill_3'])
                skillString += '\n3. ' + result['skill_3'];

            sendTextMessage(sender, skillString);
        }, 1000);
    }, selectedProject);

    setTimeout(function () {
        sendEventTrigger(sender, 'project_research');
    }, 4000);
}

function projectSupervisor(sender) {
    projectService.getProjectFromName(function (result) {
        let projectCategories = [];

        if (result['category_1']) {
            projectCategories.push(result['category_1']);
        }

        if (result['category_2']) {
            projectCategories.push(result['category_2']);
        }

        projectCategories.forEach(projectCategory => {
            setTimeout(function () {
                categoryService.getCategoryName(function (categoryName) {
                    supervisorService.getAllSupervisorByAreaOfExpertise(function (supervisors) {
                        let message = 'Supervisors for ' + categoryName + '\n\n';

                        for (let i = 0; i < supervisors.length; i++) {
                            message += (i + 1) + '. ' + supervisors[i] + '\n';
                        }
                        sendTextMessage(sender, message);

                    }, projectCategory);
                }, projectCategory);
            }, 1000);
        });

        setTimeout(function () {
            sendEventTrigger(sender, 'project_supervisor');
        }, 4000)

    }, selectedProject)
}

function getSupervisorDetail(sender, supervisorName) {
    supervisorService.getSupervisorDetails(function (supervisorDetails) {
        let messageString = supervisorName + '\n';
        messageString += 'Position: ' + supervisorDetails['position'] + '\n';
        messageString += 'Phone No: ' + supervisorDetails['phone_number'] + '\n';
        messageString += 'Email: ' + supervisorDetails['email'] + '\n';

        if (supervisorDetails['office_hours']) {
            messageString += 'Office Hours: ' + supervisorDetails['office_hours'] + '\n';
        }
        messageString += 'Location: ' + supervisorDetails['location'];

        sendTextMessage(sender, messageString);
    }, supervisorName);

    setTimeout(function () {
        sendEventTrigger(sender, 'project_supervisor_another');
    }, 5000);
}

function getResearchMaterials(sender) {
    projectService.getProjectFromName(function (result) {
        let projectCategory = [];
        let subCategory1 = false;
        let subCategory2 = false;

        let researchJSON = [];
        if (result['category_1']) {
            projectCategory.push(result['category_1']);
        }
        if (result['category_2']) {
            projectCategory.push(result['category_2']);
        }

        projectCategory.forEach(category => {
            subCategoryService.getSubCategory(function (subCategoryList) {
                for (let i = 0; i < subCategoryList.length; i++) {
                    if (result['sub_category_1'] === subCategoryList[i]['id']) {
                        subCategory1 = true
                    }

                    if (result['sub_category_2'] === subCategoryList[i]['id']) {
                        subCategory2 = true
                    }
                }
            }, category)
        });

        setTimeout(function () {
            if (subCategory1) {
                researchService.getResearchFromSubCategory(function (researchResult) {
                    researchJSON.push(researchResult);
                }, result['sub_category_1'])
            } else {
                researchService.getResearchFromCategory(function (researchResult) {
                    researchJSON.push(researchResult);
                }, result['category_1'])
            }

            if (subCategory2) {
                researchService.getResearchFromSubCategory(function (researchResult) {
                    researchJSON.push(researchResult);
                }, result['sub_category_2'])
            } else {
                researchService.getResearchFromCategory(function (researchResult) {
                    researchJSON.push(researchResult);
                }, result['category_2'])
            }

            setTimeout(function () {
                getResearchURL(sender, researchJSON)
            }, 1000)

        }, 1000);

    }, selectedProject);
}

function getResearchURL(sender, researchJSON) {
    researchJSON.forEach(research => {
        let researchTopics = [];

        if (research['research_1']) {
            researchTopics.push(research['research_1']);
        }

        if (research['research_2']) {
            researchTopics.push(research['research_2']);
        }

        if (research['research_3']) {
            researchTopics.push(research['research_3']);
        }

        if (research['research_4']) {
            researchTopics.push(research['research_4']);
        }

        researchTopics.forEach(researchTopic => {
            setTimeout(function () {
                scrapper.getResearchPapers(function (result) {
                    let messageString = researchTopic + '\n \n';
                    for (let i = 0; i < result.length; i++) {
                        messageString += '\n' + (i + 1) + '. ' + result[i]['title'] + '\n' + result[i]['link'] + '\n'
                    }
                    sendTextMessage(sender, messageString)
                }, researchTopic)
            }, 2000)
        });
    });

    if(!projectInfoStatus){
        setTimeout(function () {
            sendEventTrigger(sender, 'project_info');
        }, 10000)
    }
}

function populateCategory() {
    allCategories = {};
    categoryService.getAllCategoryDetails(function (categories) {
        categories.forEach(category => {
            allCategories[category.id] = category.name
        })
    })
}

function populateSubCategory() {
    allSubCategories = {};
    subCategoryService.getAllSubCategoryDetails(function (categories) {
        categories.forEach(category => {
            allSubCategories[category.id] = category.name
        })
    })
}

function getProjectsForOtherFields(sender) {
    if (selectedCategoryOfUser) {
        let projectCategories = [];
        let categoryId = Object.keys(allCategories).find(key => allCategories[key] === selectedCategoryOfUser);

        projectList.forEach(project => {
            if (project['category_1'] !== categoryId && project['category_1']) {
                if (!projectCategories.includes(project['category_1'])) {
                    projectCategories.push(project['category_1']);
                }
            }

            if (project['category_2'] !== categoryId && project['category_2']) {
                if (!projectCategories.includes(project['category_2'])) {
                    projectCategories.push(project['category_2']);
                }
            }
        });

        setTimeout(function () {
            let newReplies = [];
            for (let i = 0; i < projectCategories.length; i++) {
                newReplies.push({
                    'content_type': 'text',
                    'title': allCategories[projectCategories[i]],
                    'payload': allCategories[projectCategories[i]]
                });
            }

            sendQuickReply(sender, "Other fields with " + selectedCategoryOfUser + " are listed below. Please select one of them.", newReplies);
        }, 1000)
    }

    if (selectedSubCategoryOfUser) {
        let projectSubCategories = [];
        let subCategoryId = Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser);

        projectList.forEach(project => {
            if (project['sub_category_1'] !== subCategoryId && project['sub_category_1']) {
                if (!projectSubCategories.includes(project['sub_category_1'])) {
                    projectSubCategories.push(project['sub_category_1']);
                }
            }

            if (project['sub_category_2'] !== subCategoryId && project['sub_category_2']) {
                if (!projectSubCategories.includes(project['sub_category_2'])) {
                    projectSubCategories.push(project['sub_category_2']);
                }
            }
        });

        setTimeout(function () {
            let newReplies = [];
            for (let i = 0; i < projectSubCategories.length; i++) {
                newReplies.push({
                    'content_type': 'text',
                    'title': allSubCategories[projectSubCategories[i]],
                    'payload': allSubCategories[projectSubCategories[i]]
                });
            }
            sendQuickReply(sender, "Other fields with " + selectedSubCategoryOfUser + " are listed below. Please select one of them.", newReplies);
        }, 1000)
    }
}

function showListOfProjectFromCategories(sender, category1, category2) {
    let messageString = 'Projects with ' + allCategories[category1] + ' and ' + allCategories[category2] + ': \n\n';
    projectService.getProjectFromCategories(function (projectList) {
        for (let i = 0; i < projectList.length; i++) {
            messageString += (i + 1) + '. ' + projectList[i] + '\n'
        }

        setTimeout(function () {
            sendTextMessage(sender, messageString);
            setTimeout(function () {
                sendEventTrigger(sender, 'project_suitability');
            }, 3000)
        }, 1000)

    }, category1, category2);


}

function showListOfProjectFromSubCategories(sender, category1, category2) {
    let messageString = 'Projects with ' + allSubCategories[category1] + ' and ' + allSubCategories[category2] + ': \n\n';
    projectService.getProjectFromSubCategories(function (projectList) {
        for (let i = 0; i < projectList.length; i++) {
            messageString += (i + 1) + '. ' + projectList[i] + '\n'
        }

        setTimeout(function () {
            sendTextMessage(sender, messageString);
            setTimeout(function () {
                sendEventTrigger(sender, 'project_suitability');
            }, 3000)
        }, 1000)

    }, category1, category2);
}

function sortProjectList(sender, skill_1) {
    projectService.getProjectFromSkill(function (projects) {
        let messageString = 'Projects after Shortlisting' + '\n\n';
        for (let i = 0; i < projects.length; i++) {
            messageString += (i + 1) + '. ' + projects[i] + '\n'
        }

        setTimeout(function () {
            console.log(messageString);
            sendTextMessage(sender, messageString);
            setTimeout(function () {
                sendEventTrigger(sender, 'project_suitability');
            }, 9000)
        }, 1000)

    }, skill_1, Object.keys(allSubCategories).find(key => allSubCategories[key] === selectedSubCategoryOfUser));
}

function setRepliesForSupervisors(sender){
    let newReplies = [];

    for (let key in allCategories) {
        if (allCategories.hasOwnProperty(key)) {
            newReplies.push({
                'content_type': 'text',
                'title': allCategories[key],
                'payload': allCategories[key]
            });
        }
    }
    newReplies.push({
        'content_type': 'text',
        'title': 'No, Thank you',
        'payload': 'No, Thank you'
    });
    sendQuickReply(sender, "Please select the area of Expertise of the Supervisor.", newReplies);
}

function displaySupervisorListAccordingToCategory(sender, categoryId) {
    supervisorService.getAllSupervisorByAreaOfExpertise(function (supervisors) {
        if(supervisors.length > 0){
            let message = 'Supervisors for ' + allCategories[categoryId] + '\n\n';

            for (let i = 0; i < supervisors.length; i++) {
                message += (i + 1) + '. ' + supervisors[i] + '\n';
            }
            sendTextMessage(sender, message);

            setTimeout(function () {
                sendEventTrigger(sender, 'find_supervisor_select');
            }, 4000);
        }
        else{
            let newReplies = [];

            for (let key in allCategories) {
                if (allCategories.hasOwnProperty(key)) {
                    newReplies.push({
                        'content_type': 'text',
                        'title': allCategories[key],
                        'payload': allCategories[key]
                    });
                }
            }
            newReplies.push({
                'content_type': 'text',
                'title': 'No, Thank you',
                'payload': 'No, Thank you'
            });
            sendQuickReply(sender, "Sorry there are no Supervisors for this Project Area. \n\nPlease select another area of Expertise for the Supervisor.", newReplies);
        }
    }, categoryId)
}
