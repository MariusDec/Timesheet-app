# Timesheet Web Application

I want to create a timesheet web application. It needs to support quickly entering the logged time. The data should be stored persistently using a SQLite database.

## Architecture

* It should use solid.js
* It should be split into multiple files, the organization should be logical and easy to follow, following the standards best practice
* It should use tauri and be able to be installed as a windows app

## Structure

It should have 3 pages:

### Timesheet page

#### Week Date Filter

* It should have a week date filter at the top allowing to select the week to show
* It should only allow to select one single week at a time.
* It should have left/right buttons on the page that:
  * Allows switching between weeks, months, or selected interval range
  * Navigate by week
* When navigating left/right, if the date range matches any of "This Week", "Last Week", that should be displayed instead of the date range. Otherwise it should display the date range: "DD/MM/YYYY - DD/MM/YYYY"
* When the date filter popup is expanded:
  * It should have a calendar view when expanded.
  * It should highlight the whole week under the mouse cursor.
  * Selecting a date should select the whole week containing that date
  * It should also contain quick selections "This Week", "Last Week".
* When changing the week, the timesheet table should reload the tasks and hours logged for that week.

#### Tasks Table

It should contain a table that allows:

* The first row should display the task name
* The first row of the unentered row should contain a Projects button (styled differently with a + icon) that opens the Projects Dropdown
* Columns 2-8 should contain the days of the week of a single week (Monday to Sunday). The column headers should be in the format "Mo, May 4" / "Tu, May 5". It should allow entering the time worked either as a number in minutes or hours (30 = 30 minutes, 70 = 1 hour 10 minutes. But 100 = 1 hour, 120 = 1 hour 20 minutes, 170 = 2 hours 10 minutes) - every hundred (100, 200, 300) represents hours, every tens (10, 15, 35) represents minutes (overflowing into hours if over 60) -, or in Jira format (10m = 10 minutes, 0.5h (or .5h) = 30 minutes, 2h = 2 hours, 2h 10m = 2 hours 10 minutes), or in the format "hh:mm:ss" (with seconds part optional). After the textbox loses focus it should display the time entered as "hh:mm:ss".
* Column 9 should have the header "Total" and contain the total time logged for that row (for that task). It should display in the format "hh:mm:ss". E.g., if a task (row) has the following times logged:
  * Mo, May 4: 02:00:00
  * We, May 6: 03:30:00
  * Total should be: 05:30:00
* Column 10 should have an "X" button, allowing to quickly delete a row.
* The weekends and holidays in Romania should be highlighted softly
* The current day (today) should be highlighted differently than the weekends

#### Projects Dropdown

When the "Select project" button is clicked, a popup starting from that button is open:

* It should start from the button position:
  * If there's enough space below the button, the top of the popup should be connected to the bottom of the button (open below)
  * If there's not enough space below the button, the bottom of the popup should be connected to the top of the button (open above)
  * The popup should fit inside the window if possible (should have a reasonable min and max height)
* Has a search input at the top allowing to search for a project or task
* Displays a Sort By at the top with 2 options/buttons: Last Used, Name. By default the tasks will be sorted by Last Used. Clicking on any of the buttons immediately sorts the tasks lists
* Below that it displays the list of projects
  * Each project can be expanded (collapsed by default, unless only one project exists, otherwise expanded by default) to view the list of tasks under that project.
  * On the right hand side of each task there is a Star icon, allowing to favorite the task, always displaying it/them at the top.
  * Expanding a project expanded the list of tasks of that project and collapses all other expanded projects
* On the top of the list of tasks under a project there is a button that allows creating a new project (should have a + in a circle icon and have a different style that the rest of the list).
  * Pressing the "Create new task" opens a create task dialog that allows to enter the task name and save (the text input should be automatically highlighted and should be multi-line). Pressing "Enter" in this dialog should act as "Create". Pressing "Esc" should close the dialog. All the consecutive spaces in the task name will be collapsed to a single space and all new lines be deleted / replaced by space.
  * Creating a new task immediately adds it to the task list under that project, at the top and selects it (as if it was clicked).
* Right clicking on a task should present 2 options:
  * Edit: A dialog is displayed with a textarea (with keyboard focus by default), containing the task name already filled in. Pressing save updates the task name in the database.7668
  *  Delete: deletes the task (with a confirmation dialog stating clearly the intention). The task should only be marked as deleted in the database. No already entered time entries should be affected.

### Export page

#### Date Filter

* It should have a date filter at the top
* It should allow selecting a date range
* It should have left/right buttons on the page that:
  * Allows switching between weeks, months, or selected interval range
  * Navigate by week if "This week" or "Last Week" are selected
  * Navigate by month (first day to last day of that month) when "This Month" or "Last Month" is selected
  * Navigate the arbitrary range if manual date range has been selected
* When navigating left/right, if the date range matches any of "This Week", "Last Week", "This Month", "Last Month", that should be displayed instead of the date range. Otherwise it should display the date range: "DD/MM/YYYY - DD/MM/YYYY"
* When the date filter popup is expanded:
  * It should have a calendar view when expanded.
  * Selecting a date should wait to select another date (and highlight the interval between the selected and highlighted date).
  * It should also contain quick selections "This Week", "Last Week", "This Month", "Last Month".
* It should also contain a read-only table showing every day in the selected interval and every task worked on and the time worked on it, in the selected time frame. It should have 4 columns:
  * Date: It should contain the date in the format "DD/MM/YYYY"
  * Time: The time worked on each task. In the format "hh:mm:ss"
  * Project: The project name
  * Task: The task name. One row for each task worked on for each day.
* Above the table should be an export button, allowing to export the selected interval to CSV.
  * The CSV should be named "Timesheet-{Date}.csv", where {Date} is the day the export was made (today), e.g. 20260511.
  * The data in the CSV export should be the same as the one displayed in the table, along with the same column headers.
  * The time should be expressed as decimals (the integral part is hours and the fractional part is the minutes percent relative to 60. E.g. 4h 30m means 4.50).

### Settings page

* It should allow creating/archiving (never deleting) projects
* It should allow un-archiving archived project (archived projects ar not visible under the Timesheet page)
* It should support exporting and importing the database (either as a SQLite (or different) atabase, or as a file (xml/json or anything else, based on size and efficiency))
