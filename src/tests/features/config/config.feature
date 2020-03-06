Feature: Config-service tests
  Check that a config for each service has a right values

  Scenario Outline: Check config generation
    When retrieve config using <service_name>
    Then generated config is as for <service_name>

    Examples:
      | service_name    |
      | commandgateway  |
      | emailmanagement |

  Scenario: Check http://config-service-host/keycloak
    When config-servcie: check /keycloak
