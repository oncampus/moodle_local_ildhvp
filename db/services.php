<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @package    local_ildhvp
 * @copyright  2018 ILD, Technische Hochschule Lübeck (https://www.th-luebeck.de/ild)
 * @author     Eugen Ebel (eugen.ebel@th-luebeck.de)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$functions = array(
    'local_ildhvp_setgrade' => array(
        'classname' => 'local_ildhvp_external',
        'methodname' => 'setgrade',
        'classpath' => 'local/ildhvp/externallib.php',
        'description' => 'Set H5P grade',
        'type' => 'write',
        'ajax' => true
    )
);

$services = array(
    'ildhvp_setgrade' => array(
        'functions' => array('local_ildhvp_setgrade'),
        'restrictedusers' => 0,
        'enabled' => 1,
    )
);