<?php
/**
 * Name: GetBucketConfig.php
 * Description: A Dokuwiki action plugin to load the S3 config for the browser.
 *
 * Author: Phil Hopper
 * Date:   2015-01-06
 */

// must be run within Dokuwiki
if(!defined('DOKU_INC')) die();

class action_plugin_door43obsaudioupload_GetBucketConfig extends DokuWiki_Action_Plugin {

    /**
     * Registers a callback function for a given event
     *
     * @param Doku_Event_Handler $controller DokuWiki's event controller object
     * @return void
     */
    public function register(Doku_Event_Handler $controller) {
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handle_ajax_call_unknown');
        $controller->register_hook('ACTION_ACT_PREPROCESS', 'BEFORE', $this, 'handle_do_action');
    }

    /**
     * Gets the S3 bucket config
     *
     * @param Doku_Event $event  event object by reference
     * @param mixed      $param  [the parameters passed as fifth argument to register_hook() when this
     *                           handler was registered]
     * @return void
     */
    public function handle_ajax_call_unknown(Doku_Event &$event, $param) {

        if ($event->data !== 'obsaudioupload_bucket_config_request') return;

        //no other ajax call handlers needed
        $event->stopPropagation();
        $event->preventDefault();

        // read the config file
        $config = json_decode(file_get_contents('/usr/share/httpd/.ssh/door43bucket.conf'));

        // do not send the secret key
        unset($config->secretKey);

        header('Content-Type: application/json');

        echo json_encode($config);
    }

    /**
     * Gets the S3 bucket config
     *
     * @param Doku_Event $event  event object by reference
     * @param mixed      $param  [the parameters passed as fifth argument to register_hook() when this
     *                           handler was registered]
     * @return void
     */
    public function handle_do_action(Doku_Event &$event, $param) {

        if ($event->data !== 'obsaudioupload_signature_request') return;

        //no other ajax call handlers needed
        $event->stopPropagation();
        $event->preventDefault();

        // read the config file
        $config = json_decode(file_get_contents('/usr/share/httpd/.ssh/door43bucket.conf'));

        // get the input
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        // output
        header('Content-Type: application/json');

        $policy = base64_encode(utf8_encode($raw));
        $signature = base64_encode(hash_hmac( 'sha1', $policy, $config->secretKey, true));
        $return = '{"policy": "' . $policy . '", "signature": "' . $signature . '"}';
        echo $return;
        exit();
    }
}
