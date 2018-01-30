# nodeschool-questions

Environment variables: `GH_KEY` and `PORT`

Start server with `node server.js`.


## Tables (Sublevels)
### index

Find issues for keywords, sorted by score.

- Key: `${keyword}~${score}-${issueNumber}`, e.g. `chrome~00092-1916`
- Value `${issueTableKey}`, e.g. `01916`

### issue

Get the full github info for an issue.

- Key: `${zeroFilledIssueNumber}`, e.g. `02258`
- Value: `${issueObjectJSON}`, e.g. `{"url":"https://api.gi...`

### keys

Relation from issue numbers to their index entries. For deleting the respective
index entries from the table for a specific isssue.

- Key: `${issueNumber}`, e.g. `999`
- Value: `${indexKeysJSON}`, e.g. `'["m~00096-999","sure~00096`
