Feature: User-management service
  check um service manages a user in a right way

  Scenario: Add a user
    When add a random user into the system
    Then a user has been added

  Scenario: Delete a user
    When add a random user into the system
    Then a user has been added
    Then delete a user

  Scenario: Restore and reset password
    When add a random user into the system
    Then a user has been added
    Then send command to restore password
    Then send command to reset password

  Scenario: Activate a user
    Given a random user in disabled state
    When activate the user
    Then http request is completed successfully
    And received message "Command user.activate successfully executed" from web socket

  Scenario: Deactivate a user
    Given a random user in enabled state
    When deactivate the user
    Then http request is completed successfully
    And received message "Command user.deactivate successfully executed" from web socket

  Scenario: Update an email
    Given a random user in enabled state
    When update the user email
    Then http request is completed successfully
    And received message "Command user.updateEmail successfully executed" from web socket
    When the user login to the system with success

  Scenario: User logout
    Given a random user in enabled state
    When the user login to the system with success
    Then the number of user sessions equals 1
    When send command to logout user
    Then http request is completed successfully
    And received message "Command user.logout successfully executed" from web socket
    And the number of user sessions equals 0

  Scenario: An enabled user can login to the system
    Given a random user in enabled state
    When the user login to the system with success

  Scenario: A disabled user cannot login to the system
    Given a random user in disabled state
    When the user login to the system without success
