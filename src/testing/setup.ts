// Run every test in India's time zone (UTC+5:30), where the app is used. Date bugs that
// only appear east of UTC (like dates of birth being saved a day early) then fail here.
process.env['TZ'] = 'Asia/Kolkata';
