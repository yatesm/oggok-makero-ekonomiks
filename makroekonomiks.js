const Discord = require('discord.js');

// config.json file that contains our token and our prefix values. 
// config.token contains the bot's token
// config.prefix contains the message prefix.
const config = require("./config.json");

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

global.fetch = require("node-fetch");

console.log("Depended on dependencies");

const client = new Discord.Client();

console.log("Instantiated the Discord Client");

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log("Bot has started, with ${client.users.size} users, in ${client.channels.size} channels"); 
});

client.on("message", async message => {
	// This event will run on every single message received, from any channel or DM.
  
	// It's good practice to ignore other bots. This also makes your bot ignore itself
	// and not get into a spam loop (we call that "botception").
	if(message.author.bot) return;
	
	// Also good practice to ignore any message that does not start with our prefix, 
	// w0hich is set in the configuration file.
	if(!message.content.startsWith(config.prefix)) return;

	const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();
	console.log("received command " + command);
	switch(command) {
		case 'pricecheck':
			const price_check_message = args.join(" ");
			console.log("Executing price check on " + price_check_message);
			var price_data = fetch_pricedata(price_check_message);
			var data = analyze_data(price_data);
			console.log("DATA: " + data);
			output_data(data, price_check_message, message);
		break;
	}
});

console.log("Doing the login");

client.login(config.token);

console.log("Login done");

function fetch_pricedata(itemName) {
	var URL = 'https://api.araduneauctions.net/GetSalesLogs';
	var request = URL + "?searchTerm=" + itemName + "&pageNum=1&pageSize=100&filter=sell&exact=false";
	var httpRequest = new XMLHttpRequest();
	httpRequest.open('GET', request, false);
	httpRequest.send();
	if(httpRequest.status == 200) {
		console.log("Received response: " + httpRequest.status + " " + httpRequest.statusText);
		return JSON.parse(httpRequest.responseText);
	} else {
		console.log("Error when executing: " + httpRequest + ": RESPONSE_CODE:" + httpRequest.status);
		console.log(httpRequest.response);
	}
}

function analyze_data(price_data) {
	console.log("Price_Datam = " + price_data);
	console.log("total_count = " + price_data['total_count']);
	var items = price_data['items'];
	var data = {};
	
	//If no prices, return imemdiately.
	if(items.length == 0) {
		console.log("item prices is empty, returning early");
		data['is_empty'] = true;
		return data;	
	} else {
		console.log("items not empty, items.length == " + items.length);
		data['is_empty'] = false;
	}
	
	data['min'] = 99999999;
	data['max'] = 0;
	data['average'] = 0;
	data['std_dev'] = 0;
	data['date_since'] = new Date();
	data['date_since'] = data['date_since'].setFullYear(data['date_since'].getFullYear() + 10);
	
	let priceMap = new Map();
	
	//Find min, max, average and min date
	for(i = 0; i < items.length; i++) {
		item = items[i];
		
		if(item['plat_price'] == 0)
			continue;
		
		if(!priceMap.has(item['auctioneer'])) {
			priceMap.set(item['auctioneer'], item);
		} else {
			continue;
		}
		var date = Date.parse(item['datetime']);
		data['date_since'] = item['datetime'] < data['date_since'] ? date : data['date_since'];
		data['max'] = item['plat_price'] > data['max'] ? item['plat_price'] : data['max'];
		data['min'] = item['plat_price'] < data['min'] ? item['plat_price'] : data['min'];
		data['average'] += item['plat_price'];
	}
	
	data['average'] /= priceMap.size;
	
	for (const [key, value] of priceMap.entries()) {
		data['std_dev'] += Math.pow(value['plat_price'] - data['average'], 2);
	}
	
	data['std_dev'] = Math.sqrt(data['std_dev'] / priceMap.size);2
	
	data['num_transactions'] = priceMap.size;
	data['date_since'] = new Date(data['date_since'] * 1000);
	console.log("Average: " + data['average'] + " Std_dev: " + data['std_dev'] + " Min: " + data['min'] + " Max: " + data['max'] + " date_since: " + data['date_since']);
	return data;
}

function output_data(data, itemName, message) {
	var response = "OggoMetriks Makro Ekonomiks Report for " + itemName + "\n";
	
	//
	if(data['is_empty']) {
		message.channel.send(response + "No OggoMetriks found for " + itemName);
		return;
	}
	
	response += "*** Average Price : " + Math.ceil(data['average']) + "pp\n"
		+ "**** Min: " + data['min'] + "pp *** Max: " + data['max'] + "pp *** Std Dev: " + Math.ceil(data['std_dev']) + "pp\n"
		+ "**** OggoMetriks based on " + data['num_transactions'] + " transactions since: " + data['date_since'];
	
	message.channel.send(response);
	
}	