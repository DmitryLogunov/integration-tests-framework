Feature: Command-gateway tests

  Scenario: Send a command using wrong auth token
    When send a command using wrong auth token

  Scenario: Send a command into non-existing topic
    When send a command into non-existing topic

  Scenario: Get authenticated using wrongs creds
    When try to login using wrong creds

  Scenario: Get authenticated using wrongs password
    When try to login using wrong password

  Scenario: Send valid command Halo
    When Halo command: should get response OK if we use valid access token

  Scenario: Send valid command Logflush
    When Logflush command: should get response OK if we use valid access token

  Scenario: Send not valid command Logflush
    When NOT valid Logflush command: should get response Error NOT_VALID_COMMAND if we use valid access token

  Scenario: Anonymous user is notified of successful command execution
    Given a random user in enabled state
    When the user send restorePassword command anonymously
    Then the user should receive a success message via a web socket

  Scenario: Anonymous user is notified of failed command execution
    When the user send resetPassword command with incorrect restore_password_token in the request body
    Then the user should receive a failed message via a web socket
