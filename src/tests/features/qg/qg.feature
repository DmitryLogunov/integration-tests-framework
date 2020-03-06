Feature: Query-gateway tests

  Scenario: Make query using wrong auth token
    When make query using wrong auth token

  Scenario: Make wrong query
    When make wrong query

   Scenario: Make valid query
    When make valid query

  Scenario: Subscribe halo
    When send halo and subscribe to halo_emit
    Then should receive halo_emit from all services
