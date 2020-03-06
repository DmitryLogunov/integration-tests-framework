Feature: Email-service tests

  Scenario: Send an email
    When send a command email.send
    Then command has been executed

  Scenario: Send an email with attachment
    When send a command email.send with attachment
    Then command has been executed

  Scenario Outline: Send an email to wrong address
    When send a command email.send with params: <to_address>
    Then request failed with status code <http_status> and message <response_message>

    Examples:
      | to_address    | http_status | response_message                                    |
      | wrong_address | 400         | Command.body.to_address should match format "email" |
