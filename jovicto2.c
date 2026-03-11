#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/select.h>
#include <netinet/in.h>

typedef struct s_client {
	int id;
	char message[300000];
}	t_client;

t_client clients[1024];
int max_fd = 0, max_id = 0;
char send_buffer[400000], recv_buffer[300000];
fd_set write_fds, read_fds, current_fds;

void err(char *msg) {
	write(2, msg ? msg : "Fatal error", msg ? strlen(msg) : 11);
	write(2, "\n", 1);
	exit(1);
}

void broadcast(int sender_fd) {
	for(int fd = 0; fd <= max_fd; fd++)
		if(FD_ISSET(fd, &write_fds) && fd != sender_fd)
			send(fd, send_buffer, strlen(send_buffer), 0);
}

int main(int argc, char **argv) {
	if(argc != 2)
		err("Wrong number of arguments");

	struct sockaddr_in server;
	int server_fd = socket(AF_INET, SOCK_STREAM, 0);
	if(server_fd < 0)
		err(NULL);
	max_fd = server_fd;

	FD_ZERO(&read_fds);
	FD_ZERO(&write_fds);
	FD_ZERO(&current_fds);
	FD_SET(server_fd, &current_fds);

	memset(&clients, 0, sizeof(clients));
	memset(&server, 0, sizeof(server));

	server.sin_port = htons(atoi(argv[1]));
	server.sin_addr.s_addr = htonl(INADDR_ANY);
	server.sin_family = AF_INET;

	if(bind(server_fd, (struct sockaddr *)&server, sizeof(server)) < 0) {
        close(server_fd);
        err(NULL);
    }
    if(listen(server_fd, 100) < 0) {
        close(server_fd);
        err(NULL);
    }

	while(1) {
		write_fds = current_fds;
		read_fds = current_fds;
		
		if(select(max_fd + 1, &read_fds, &write_fds, NULL, NULL) < 0) {
			close(server_fd);
			FD_CLR(server_fd, &current_fds);
			err(NULL);
		}

		for(int fd = 0; fd <= max_fd; fd++) {
			if(FD_ISSET(fd, &read_fds)) {
				if(fd == server_fd) {
                    socklen_t len = sizeof(server);
					int client_fd = accept(fd, (struct sockaddr *)&server, &len);
					if(client_fd < 0)
                        continue;
					if(client_fd > max_fd)
                        max_fd = client_fd;
                    FD_SET(client_fd, &current_fds);
					clients[client_fd].id = max_id++;
					sprintf(send_buffer, "server: client %d just arrived\n", clients[client_fd].id);
					broadcast(client_fd);
                    bzero(&send_buffer, strlen(send_buffer));
					break;
				}
				ssize_t buffer_length = recv(fd, recv_buffer, sizeof(recv_buffer), 0);
				if(buffer_length <= 0) {
					bzero(&send_buffer, strlen(send_buffer));
					sprintf(send_buffer, "server: client %d just left\n", clients[fd].id);
					broadcast(fd);
					FD_CLR(fd, &current_fds);
					close(fd);
					bzero(&clients[fd].message, strlen(clients[fd].message));
					break;
				}
				recv_buffer[buffer_length] = '\0';
				size_t message_last_position = strlen(clients[fd].message);
				for (ssize_t recv_index = 0; recv_index < buffer_length; recv_index++, message_last_position++)
				{
					clients[fd].message[message_last_position] = recv_buffer[recv_index];
					if (clients[fd].message[message_last_position] == '\n')
					{
						clients[fd].message[message_last_position] = '\0';
						sprintf(send_buffer, "client %d: %s\n", clients[fd].id, clients[fd].message);
						broadcast(fd);
						bzero(&send_buffer, strlen(send_buffer));
						bzero(&clients[fd].message, strlen(clients[fd].message));
						message_last_position = -1;
					}
				}
			}
		}
	}
	return (0);
}
