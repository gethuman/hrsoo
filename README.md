hrsoo
==========

This is a little utility to help parse hours of operation strings.

## Overview

A string that contains the hours of operation for a business can come in many different forms. For example:

* M-F 8-5, S 9-12
* 24 hours, 7 days
* Monday 8am EST through 4pm EST
* etc.

This library is an attempt to normalize any of these typical variations and output either a standard JSON
data structure that contains all the hours or a specific format.

## Usage - Command Line

From the command line enter:

```
npm install hrsoo -g
hrsoo -i "Monday through Friday 9 a.m. to 5 p.m."
```

## Usage - Node

From the command line enter:

```
npm install hrsoo --save
```

Then in your Node.js code use the library like this:

```
var hrsoo = require('hrsoo');
var formatted = hrsoo.format('Monday through Friday 9 a.m. to 5 p.m.');
```

## Usage - Browser

Include dist/hrsoo.min.js in your client build and reference it in a script tag on your page. Then simply:

```
var formatted = hrsoo.format('Monday through Friday 9 a.m. to 5 p.m.');
```

## Limitations / Issues

A couple of things I am still working on:

* Time spanning multiple days - It does not work right now to say 6am Monday through 5pm Friday
* Multiple timezones - Right now this only works if the input string has at most 1 timezone
* Timezone converations - I want to be able to pass in as a param the desired timezone and do a conversion
* Working with military time - Input strings that contain military time won't work yet
* Bad data - Sometimes the data is just bad. This library is not magic...but I am looking into that as well.
