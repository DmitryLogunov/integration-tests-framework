Feature: Soap-integrator service tests

  Scenario: Sending request with not valid xml
    When soap-integrator gets not valid xml response should include xml with error

  Scenario: Sending request with valid xml
    When soap-integrator gets valid xml response should include xml with no errors

  Scenario: Sending request with invalid token
    When send valid xml request with invalid token to soap-integrator
    Then request blocked with status code 401 and message "Unauthorized"

  Scenario: Checking produced kafka message after processing incoming valid xml
    When soap-integrator gets valid xml response should include xml with no errors
    Then it should produce valid message to kafka topic
