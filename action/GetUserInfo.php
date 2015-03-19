<?php
/**
 * Name: GetUserInfo.php
 * Description: A Dokuwiki action plugin to load the S3 config for the browser.
 *
 * Author: Phil Hopper
 * Date:   2015-02-10
 */

// must be run within Dokuwiki
if(!defined('DOKU_INC')) die();

class action_plugin_door43obsaudioupload_GetUserInfo extends DokuWiki_Action_Plugin {

    /**
     * Registers a callback function for a given event
     *
     * @param Doku_Event_Handler $controller DokuWiki's event controller object
     * @return void
     */
    public function register(Doku_Event_Handler $controller) {
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handle_ajax_call_unknown');
    }

    /**
     * Gets the logged in user info
     *
     * @param Doku_Event $event  event object by reference
     * @param mixed      $param  [the parameters passed as fifth argument to register_hook() when this
     *                           handler was registered]
     * @return void
     */
    public function handle_ajax_call_unknown(Doku_Event &$event, $param) {

        if ($event->data !== 'obsaudioupload_user_info_request') return;

        //no other ajax call handlers needed
        $event->stopPropagation();
        $event->preventDefault();

        // read the config file
        $userInfo = $GLOBALS['USERINFO'];
        if (empty($userInfo))
            $userInfo = array('name' => '');
        else
            unset($userInfo['pass']);

        header('Content-Type: application/json');

        echo json_encode($userInfo);
    }
}
