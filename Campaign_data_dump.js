function main() {
  // Define the custom date range
  var today = new Date();
  var firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  var startDate = Utilities.formatDate(firstDayOfMonth, 'GMT', 'yyyyMMdd'); // first day of current month
  var endDate = Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd'); // today's date
  
  // Open the spreadsheet
  var spreadsheet = SpreadsheetApp.openById('xxxxxxxx'); // Worksheet Id
  var sheet = spreadsheet.getSheetByName('xxxx'); // Sheet name
  
  // Clear the existing content
  sheet.clearContents();
  
  // Set the headers
  sheet.appendRow(['Account Name','Account ID','Campaign Name', 'Campaign ID', 'Budget Amount', 'Cost','Monthly Budget', 'Cost/Conv']);
  
  // Select the account
  var mccAccount = AdsApp.currentAccount();
  var accountIterator = AdsManagerApp.accounts().get();
  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    
    // Select the client account to operate on.
    AdsManagerApp.select(account);
    
    // Get all campaigns
    var campaignIterator = AdsApp.campaigns()
      .withCondition('Status = ENABLED') // only include running campaigns
      .get();
    while (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();
      
      
      // Get the budget
      var budget = campaign.getBudget();
      var budgetAmount = budget.getAmount();
      var monthlyBudget = budgetAmount * 30.4; // assuming 30.4 days in a month
      
      // Get the cost for the custom date range
      var report = AdsApp.report(
        'SELECT CampaignName, CampaignId, Amount, Cost, CostPerConversion ' +
        'FROM CAMPAIGN_PERFORMANCE_REPORT ' +
        'WHERE CampaignId = ' + campaign.getId() +
        ' DURING ' + startDate + ',' + endDate
      );
      
      // Add the budget information to the sheet
      var rows = report.rows();
      while (rows.hasNext()) {
        var row = rows.next();
        sheet.appendRow([account.getName(), account.getCustomerId(), row['CampaignName'], campaign.getId(), budgetAmount, row['Cost'], monthlyBudget, row['CostPerConversion']]);
      }
    }
    
    // Select the MCC account again
    AdsManagerApp.select(mccAccount);
  }
}
