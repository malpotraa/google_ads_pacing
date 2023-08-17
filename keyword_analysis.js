var TIME_PERIOD = "ALL_TIME"; // THIS_MONTH, LAST_MONTH, LAST_30_DAYS, ALL_TIME
var SPREADSHEET_ID = 'xxxxxxxx'; // Replace with your Spreadsheet ID

function main(){
  var accountIterator = AdsManagerApp.accounts().get();
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID); // Open the spreadsheet once
  
  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    AdsManagerApp.select(account);
    
    var campaignIterator = AdsApp.campaigns().get();
    var campaignCPAs = {};
    
    // Calculate CPA for each campaign
    while (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();
      var stats = campaign.getStatsFor(TIME_PERIOD);
      var conversions = stats.getConversions();
      var cost = stats.getCost();
      // set a high value if there are no conversions
      campaignCPAs[campaign.getName()] = conversions ? cost / conversions : 1000000;
    }

    var accountName = AdsApp.currentAccount().getName();
    var currency = " " + AdsApp.currentAccount().getCurrencyCode();
  
    var columns = ["CampaignName", "AdGroupName", "Criteria", "Clicks", "Cost", "Conversions", "CostPerConversion", "CampaignCPA"];
    var report_data = [columns]; // Include column headers

    // Check keywords for each campaign
    for (var campaignName in campaignCPAs) {
      var conditions = [
        "AdGroupStatus = ENABLED", // Adding condition for active ad groups
        "CampaignStatus = ENABLED", // Adding condition for active campaigns
        "CampaignName = '" + campaignName.replace(/'/g, "\\'") + "'", // For the specific campaign
        "Cost > " + Math.round(2 * campaignCPAs[campaignName] * 1000000) // Cost is more than twice the CPA of the campaign, in micros
      ];

      var columns_string = columns.join(", ");
      var conditions_string = conditions.join(" AND ");
      var awql = "SELECT " + columns_string + " FROM KEYWORDS_PERFORMANCE_REPORT WHERE " + conditions_string + " DURING " + TIME_PERIOD;
      var report = AdsApp.report(awql).rows();

      while (report.hasNext()) {
        var row = report.next();
        var metrics = [];
  
        for(var i = 0; i < columns.length - 1; i++) { // We added an extra column
          metrics.push(row[columns[i]]);
        }
        // Add campaign CPA to the end
        metrics.push(campaignCPAs[campaignName]);
        report_data.push(metrics);
      }
    }

    report_data.sort(function(a, b) {
      return b[4] - a[4]; // Sort on Cost, which is now at index 4
    });

    // Check if a sheet for this account already exists
    var sheet = spreadsheet.getSheetByName(accountName);
    if (sheet) {
      // Clear the sheet if it exists
      sheet.clear();
    } else {
      // Create a new sheet for this account
      sheet = spreadsheet.insertSheet(accountName);
    }

    // Write the report data to the sheet
    var startRow = 1;
    for (var i = 0; i < report_data.length; i++) {
      var row = report_data[i];
      var range = sheet.getRange(startRow + i, 1, 1, row.length);
      range.setValues([row]);
    }
  }
}
