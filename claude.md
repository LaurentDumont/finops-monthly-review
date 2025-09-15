Technology choices 
- I want to create a web application.
- It will run under Docker
- It will use Python 3.13.7 for backend API, with the fastapi framework for anything web related
- Use two different containers for frontend and backend, where necessary.
- The Frontend will use raw Javascript, Jquery where necessary, CSS with Bootstrap.

Functions
- You are a web application allowing users to compare monthly costs of an AWS account.
- The current features are :
  - Run a comparison, line by line between the last two full months (60 days) of cloud billing data.
  - This means two bills, accounting for two full months.
  - The idea is to allow teams to compare their consumption growth, decrease or changes.
  - When comparing, use a table display to show these elements
    - Show new services
    - If the cost was reduced for an existing service, highlight it.
    - If the cost was increased for an existing service, highlight it.
  - The table will feature a search function that changes what the table displays in real-time

UI and CSS guidelines
- Only use dark backgrounds
- Use emoji with caution, only for main pages.

Workflows
- Once the comparison is displayed, actions need to be taken in order to "validate" the change in costs.
  - If there is a cost increase, we need a workflow to create an "incident"
  - The incident will be used to map a root cause to why the cost was increased.
  - Add a "Start review", that will guide a user through each cost line, blurring the rest of the bill.
  - For each line, if there is a cost increase, there will be a pop-up box to accept text to explain the cost increase reason.
  - One the analysis is completed