<?php
$cfg['blowfish_secret'] = 'aetherpanelpma32charactersecretkeyphrase123';
$i = 0;
$i++;
$cfg['Servers'][$i]['auth_type'] = 'signon';
$cfg['Servers'][$i]['host'] = 'localhost';
$cfg['Servers'][$i]['compress'] = false;
$cfg['Servers'][$i]['AllowNoPassword'] = false;
$cfg['Servers'][$i]['SignonSession'] = 'SignonSession';
$cfg['Servers'][$i]['SignonURL'] = '/phpmyadmin/signon.php';
$cfg['UploadDir'] = '';
$cfg['SaveDir'] = '';
