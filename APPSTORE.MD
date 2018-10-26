##Description
This app adds the possibility to switch lights based on a motion sensors name
like 

PIRDN5Bathroom

will switch a light called Bathroom only when its NightTime or if a luminace sensor is found on the motionsensor a value under 50
and turn it off 5 minutes after last motion seen.

the following settings can be changed:
- prefix
- location of dimmer identifier (at this moment must be a D).
- location of the night identifier (at this moment must be N).
- location of time (at this time can only be 1-9).
- start of devicename
also:
- enable dimmer identifier
- enable night idetifier
- start daytime
- end datetime
