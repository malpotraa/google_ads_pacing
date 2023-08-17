function main() {
  // Open the spreadsheet
  var spreadsheet = SpreadsheetApp.openById('xxxxxxxx'); // Worksheet ID
  var sheet = spreadsheet.getSheetByName('xxxxxxxx'); // Sheet name
  
  // Open the log spreadsheet
  var logSpreadsheet = SpreadsheetApp.openById('xxxxxxxxx'); // Worksheet ID of the sheet to send change logs
  var logSheet = logSpreadsheet.getSheetByName('xxxxxx'); // Sheet Name
  
   // Add headers to the log sheet
  if (logSheet.getLastRow() === 0) { // check if the log sheet is empty
    logSheet.appendRow(['Account Name', 'Account ID', 'Campaign Name', 'Campaign ID', 'Current Budget', 'New Budget', 'Date']);
  }
  
  // Calculate the number of days remaining in the month
  var currentDate = new Date();
  var endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  var daysRemaining = Math.floor((endOfMonth - currentDate) / (1000 * 60 * 60 * 24)) + 1;
  
  // Get the account IDs, campaign IDs, and budgets from the spreadsheet
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var shouldProcess = data[i][4]; // The checkbox column in the sheet. [column starts from 0]
    
    if (shouldProcess === true) { // Only process rows with the checkbox ticked
      var accountId = data[i][0]; // The AccountID column in the sheet
      Logger.log('Account ID: ' + accountId);
      var campaignId = data[i][2]; // The CamapignID column in the  sheet
      var totalBudget = data[i][5]; // The Monthly_Budget column in the sheet
    
      // Select the account
      var accountIterator = AdsManagerApp.accounts().withIds([accountId]).get();
      if (accountIterator.hasNext()) {
        var account = accountIterator.next();
        var accountName = account.getName();
      
        // Select the client account to operate on.
        AdsManagerApp.select(account);
      
        // Check if the campaign ID exists
        if (campaignId) {
          // Get the campaign by ID
          var campaignIterator = AdsApp.campaigns()
            .withIds([campaignId])
            .get();
          if (campaignIterator.hasNext()) {
            var campaign = campaignIterator.next();
            var campaignName = campaign.getName();
          
            // Get the cost for the current month
            var report = AdsApp.report(
              'SELECT CampaignId, Cost ' +
              'FROM CAMPAIGN_PERFORMANCE_REPORT ' +
              'WHERE CampaignId = ' + campaignId +
              ' DURING THIS_MONTH'
            );
            var rows = report.rows();
            while (rows.hasNext()) {
              var row = rows.next();
              var cost = row['Cost'];
            
              // Calculate the new budget
              var newBudgetAmount = (totalBudget - cost) / daysRemaining;
            
              // Get the current budget
              var budget = campaign.getBudget();
              var currentBudgetAmount = budget.getAmount();
            
              // Check if the new budget amount is more or less than 5% of the past budget amount
              var lowerLimit = currentBudgetAmount * 0.95;
              var upperLimit = currentBudgetAmount * 1.05;
              if (newBudgetAmount < lowerLimit || newBudgetAmount > upperLimit) {
                // Update the budget
                budget.setAmount(newBudgetAmount);
              
                // Log the change
                logSheet.appendRow([accountName, accountId, campaignName, campaignId, currentBudgetAmount, newBudgetAmount, new Date()]);
              }
            }
          }
        }
      }
    }
  }
  // Send the Slack message.
  sendSlackMessage();
}
// To send a slack message when the script finishes running
function sendSlackMessage() {
  var webhookUrl = 'xxxxxxxx'; // Slack Webhook URL.
  
  var completionTime = new Date().toLocaleString();
  var docLink = 'xxxxxxxxxx'; // Google Docs link.

  var options = {
    method: 'post',
    payload: JSON.stringify({
      "text": `The Google Ads script has finished running at ${completionTime}. Change Log: <${docLink}|Logsheet>`
    })
  };

  UrlFetchApp.fetch(webhookUrl, options);
}

