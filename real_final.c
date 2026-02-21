#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/select.h>
#include <netinet/in.h>

typedef struct s_client {
	int id;
	char msg[300000];
}	t_client;

t_client clients[1024];
int max_fd = 0, global_id = 0;
char send_buff[400000], recv_buff[300000];
fd_set write_fds, read_fds, curr_fds;

void err(char *msg) {
	if(msg)
		write(2, msg, strlen(msg));
	else
		write(2, "Fatal error", 11);
	write(2, "\n", 1);
	exit(1);
}

void broadcast(int e) {
	for(int fd = 0; fd <= max_fd; fd++)
		if(FD_ISSET(fd, &write_fds) && fd != e)
			if(send(fd, send_buff, strlen(send_buff), 0) < 0);
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
	FD_ZERO(&curr_fds);
	FD_SET(server_fd, &curr_fds);

	memset(&clients, 0, sizeof(clients));
	memset(&server, 0, sizeof(server));

	server.sin_port = htons(atoi(argv[1]));
	server.sin_family = AF_INET;
	server.sin_addr.s_addr = htonl(INADDR_ANY);

	if(bind(server_fd, (struct sockaddr *)&server, sizeof(server)) < 0) {
        close(server_fd);
        err(NULL);
    }
    if(listen(server_fd, 100) < 0) {
        close(server_fd);
        err(NULL);    
    }

	while(1) {
		write_fds = curr_fds;
		read_fds = curr_fds;
		if(select(max_fd + 1, &read_fds, &write_fds, NULL, NULL) < 0) {
			close(server_fd);
			FD_CLR(server_fd, &curr_fds);
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
                    FD_SET(client_fd, &curr_fds);
					clients[client_fd].id = global_id++;
					sprintf(send_buff, "server: client %d just arrived\n", clients[client_fd].id);
					broadcast(client_fd);
                    bzero(&send_buff, strlen(send_buff));
					break;
				} else {
					ssize_t buff_len = recv(fd, recv_buff, sizeof(recv_buff), 0);
					if(buff_len <= 0) {
						bzero(&send_buff, strlen(send_buff));
						sprintf(send_buff, "server: client %d just left\n", clients[fd].id);					
						broadcast(fd);
						FD_CLR(fd, &curr_fds);
						close(fd);
                        bzero(&clients[fd].msg, strlen(clients[fd].msg));
						break;
					} else {
						recv_buff[buff_len] = '\0';
						int j = strlen(clients[fd].msg);
						for(int i = 0; i < buff_len; i++, j++) {
							clients[fd].msg[j] = recv_buff[i];
							if(clients[fd].msg[j] == '\n') {
								clients[fd].msg[j] = '\0';
								sprintf(send_buff, "client %d: %s\n", clients[fd].id, clients[fd].msg);
								broadcast(fd);
								bzero(&send_buff, strlen(send_buff));
								bzero(&clients[fd].msg, strlen(clients[fd].msg));
								j = -1;
							}
						}
					}
				}
			}
		}
	}
	return (0);
}